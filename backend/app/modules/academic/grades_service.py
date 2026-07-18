"""Grades, assessments, materials, and notifications service."""

from __future__ import annotations
import csv
import io
import uuid
from datetime import datetime, date
from zoneinfo import ZoneInfo
from typing import Optional
from sqlalchemy.orm import Session, joinedload

from app.models.instructor import Instructor
from app.models.student import Student
from app.models.course_offering import CourseOffering
from app.models.assessment import Assessment
from app.models.grade import Grade
from app.models.grading_policy import GradingPolicy
from app.models.course_material import CourseMaterial
from app.models.notification import Notification
from app.models.enrollment import Enrollment
from app.models.enums import AssessmentType, MaterialType
from app.modules.academic.exceptions import (
    CourseNotFoundException,
    InstructorNotAssignedException,
    InstructorProfileNotFoundException,
    StudentProfileNotFoundException,
    AssessmentNotFoundException,
    AssessmentValidationException,
    GradeImportException,
    MaterialNotFoundException,
    UnauthorizedAccessException,
)
from app.modules.academic.grading_engine import (
    TYPE_TO_DIST,
    active_components,
    assessment_csv_column,
    compute_student_course_grade,
)


FIXED_SINGLETON_TYPES = {AssessmentType.midterm.value, AssessmentType.final.value, AssessmentType.attendance.value}
POLICY_EXCLUDED_TYPES = {AssessmentType.attendance.value}
MULTI_TYPES = {AssessmentType.quiz.value, AssessmentType.assignment.value, AssessmentType.lab.value}
# Per-assessment columns and component subtotals share this order
ASSESSMENT_DISPLAY_ORDER = ["quiz", "assignment", "lab", "attendance", "midterm", "final"]
COMPONENT_ORDER = ASSESSMENT_DISPLAY_ORDER
_DISPLAY_ORDER_INDEX = {t: i for i, t in enumerate(ASSESSMENT_DISPLAY_ORDER)}

BD_TZ = ZoneInfo("Asia/Dhaka")


def _parse_assessment_datetime(value: Optional[str]) -> Optional[datetime]:
    """Parse exam window datetimes; naive values are treated as Bangladesh Standard Time."""
    if not value:
        return None
    normalized = value.strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(normalized)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=BD_TZ)
    return dt
TYPE_LABELS = {
    "quiz": "Quiz",
    "assignment": "Assignment",
    "lab": "Lab",
    "midterm": "Mid",
    "final": "Final",
    "attendance": "Attendance",
}


class GradesService:
    def _assessment_type_value(self, a: Assessment) -> str:
        return a.type.value if hasattr(a.type, "value") else str(a.type)

    def _assessment_sort_key(self, a: Assessment) -> tuple:
        atype = self._assessment_type_value(a)
        created = a.created_at
        return (
            _DISPLAY_ORDER_INDEX.get(atype, 99),
            a.sequence_number or 0,
            created.timestamp() if created else 0,
        )

    def _compact_multi_assessment_sequences(self, db: Session, offering_id, commit: bool = True) -> None:
        """Renumber quiz/assignment/lab sequences to 1..n with no gaps after deletes."""
        changed = False
        for atype in MULTI_TYPES:
            assessments = (
                db.query(Assessment)
                .filter(
                    Assessment.course_offering_id == offering_id,
                    Assessment.type == atype,
                )
                .order_by(Assessment.sequence_number, Assessment.created_at)
                .all()
            )
            for index, assessment in enumerate(assessments, start=1):
                if assessment.sequence_number != index:
                    assessment.sequence_number = index
                    changed = True
        if commit and changed:
            db.commit()

    def _assessment_slug(self, a: Assessment) -> str:
        atype = a.type.value if hasattr(a.type, "value") else str(a.type)
        return assessment_csv_column(atype, a.sequence_number or 1)

    def _serialize_assessment_row(self, a: Assessment) -> dict:
        atype = a.type.value if hasattr(a.type, "value") else a.type
        return {
            "id": str(a.id),
            "course_offering_id": str(a.course_offering_id),
            "title": a.title,
            "type": atype,
            "csv_column": self._assessment_slug(a),
            "total_marks": a.total_marks,
            "weightage": a.weightage,
            "due_date": str(a.due_date) if a.due_date else None,
            "sequence_number": a.sequence_number or 1,
            "form_url": a.form_url,
            "file_url": a.file_url,
            "window_start": a.window_start.isoformat() if a.window_start else None,
            "window_end": a.window_end.isoformat() if a.window_end else None,
            "is_published": bool(a.is_published),
            "description": a.description,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }

    def _active_assessments(self, db: Session, offering: CourseOffering) -> list[Assessment]:
        active = active_components(offering.course.marks_distribution)
        self._compact_multi_assessment_sequences(db, offering.id)
        assessments = (
            db.query(Assessment)
            .filter(Assessment.course_offering_id == offering.id)
            .all()
        )
        filtered = [
            a for a in assessments
            if self._assessment_type_value(a) in active
        ]
        return sorted(filtered, key=self._assessment_sort_key)

    def _column_map(self, assessments: list[Assessment]) -> dict[str, str]:
        """Map csv_column slug and assessment UUID → assessment id."""
        mapping: dict[str, str] = {}
        for a in assessments:
            aid = str(a.id)
            slug = self._assessment_slug(a)
            mapping[slug] = aid
            mapping[slug.lower()] = aid
            mapping[aid] = aid
        return mapping

    def _notify_students_grades(
        self,
        db: Session,
        offering: CourseOffering,
        assessment: Optional[Assessment] = None,
        message: Optional[str] = None,
    ):
        course = offering.course
        title = "Grades updated"
        body = message or f"Grades have been updated for {course.course_code} — {course.title}."
        if assessment:
            atype = assessment.type.value if hasattr(assessment.type, "value") else assessment.type
            title = f"{TYPE_LABELS.get(atype, atype)} graded: {assessment.title}"
            body = message or f"Your marks for {assessment.title} in {course.course_code} have been posted."
        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .all()
        )
        for enr in enrollments:
            if enr.student and enr.student.user_id:
                db.add(Notification(
                    user_id=enr.student.user_id,
                    title=title,
                    message=body,
                    link=f"/student/my-courses/{offering.id}",
                ))
        db.commit()

    def _get_instructor(self, db: Session, user_id: str) -> Instructor:
        instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
        if not instructor:
            raise InstructorProfileNotFoundException()
        return instructor

    def _get_student(self, db: Session, user_id: str) -> Student:
        student = db.query(Student).filter(Student.user_id == user_id).first()
        if not student:
            raise StudentProfileNotFoundException()
        return student

    def _get_owned_offering(self, db: Session, user_id: str, offering_id: str) -> CourseOffering:
        instructor = self._get_instructor(db, user_id)
        offering = (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.course))
            .filter(CourseOffering.id == offering_id)
            .first()
        )
        if not offering:
            raise CourseNotFoundException("Course offering not found")
        if str(offering.instructor_id) != str(instructor.id):
            raise InstructorNotAssignedException()
        return offering

    def _get_enrolled_offering(self, db: Session, user_id: str, offering_id: str) -> tuple[Student, CourseOffering, Enrollment]:
        student = self._get_student(db, user_id)
        offering = (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.course))
            .filter(CourseOffering.id == offering_id)
            .first()
        )
        if not offering:
            raise CourseNotFoundException("Course offering not found")
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student.id,
                Enrollment.course_offering_id == offering.id,
                Enrollment.status.in_(["active", "completed"]),
            )
            .first()
        )
        if not enrollment:
            raise UnauthorizedAccessException("You are not enrolled in this course")
        return student, offering, enrollment

    def _serialize_assessment(self, a: Assessment) -> dict:
        return self._serialize_assessment_row(a)

    def _notify_enrolled_students(self, db: Session, offering: CourseOffering, title: str, message: str, link: str):
        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .all()
        )
        for enr in enrollments:
            if not enr.student or not enr.student.user_id:
                continue
            db.add(Notification(
                user_id=enr.student.user_id,
                title=title,
                message=message,
                link=link,
            ))
        db.commit()

    def _resolve_student(self, db: Session, offering_id: str, identifier: str) -> Optional[Student]:
        """Resolve by students.id UUID or student_id code; must be enrolled."""
        student = None
        try:
            uuid.UUID(identifier)
            student = db.query(Student).filter(Student.id == identifier).first()
        except ValueError:
            student = db.query(Student).filter(Student.student_id == identifier).first()
        if not student:
            return None
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student.id,
                Enrollment.course_offering_id == offering_id,
                Enrollment.status == "active",
            )
            .first()
        )
        return student if enrollment else None

    # ── Offering hub ───────────────────────────────────────────────

    def get_offering_hub(self, db: Session, user_id: str, offering_id: str, role: str) -> dict:
        if role == "instructor":
            offering = self._get_owned_offering(db, user_id, offering_id)
        else:
            _, offering, _ = self._get_enrolled_offering(db, user_id, offering_id)

        course = offering.course
        enrolled = (
            db.query(Enrollment)
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .count()
        )
        return {
            "offering_id": str(offering.id),
            "course_id": str(course.id),
            "course_code": course.course_code,
            "title": course.title,
            "description": course.description,
            "marks_distribution": course.marks_distribution,
            "class_schedule": course.class_schedule,
            "enrolled_students": enrolled,
            "active_components": active_components(course.marks_distribution),
        }

    # ── Grading policies ───────────────────────────────────────────

    def get_grading_policies(self, db: Session, user_id: str, offering_id: str) -> list:
        offering = self._get_owned_offering(db, user_id, offering_id)
        policies = db.query(GradingPolicy).filter(GradingPolicy.course_offering_id == offering.id).all()
        active = active_components(offering.course.marks_distribution)
        by_type = {p.component_type: p for p in policies}
        result = []
        for atype, weight in active.items():
            if atype in POLICY_EXCLUDED_TYPES:
                continue
            p = by_type.get(atype)
            default_count = 1 if atype in FIXED_SINGLETON_TYPES else (p.planned_count if p else 1)
            result.append({
                "component_type": atype,
                "dist_key": TYPE_TO_DIST.get(atype),
                "weight": weight,
                "planned_count": p.planned_count if p else default_count,
                "drop_lowest": p.drop_lowest if p else 0,
                "is_singleton": atype in FIXED_SINGLETON_TYPES,
            })
        return result

    def upsert_grading_policies(self, db: Session, user_id: str, offering_id: str, policies: list) -> list:
        offering = self._get_owned_offering(db, user_id, offering_id)
        active = active_components(offering.course.marks_distribution)

        for item in policies:
            atype = item.component_type if hasattr(item, "component_type") else item["component_type"]
            if atype in POLICY_EXCLUDED_TYPES:
                continue
            planned = item.planned_count if hasattr(item, "planned_count") else item.get("planned_count", 1)
            drop = item.drop_lowest if hasattr(item, "drop_lowest") else item.get("drop_lowest", 0)

            if atype not in active:
                raise AssessmentValidationException(f"Component '{atype}' is not active for this course (weight is 0)")
            if atype in FIXED_SINGLETON_TYPES:
                planned = 1
                drop = 0
            if planned < 1:
                raise AssessmentValidationException("planned_count must be at least 1")
            if drop < 0 or drop >= planned:
                raise AssessmentValidationException("drop_lowest must be between 0 and planned_count - 1")

            existing = (
                db.query(GradingPolicy)
                .filter(GradingPolicy.course_offering_id == offering.id, GradingPolicy.component_type == atype)
                .first()
            )
            if existing:
                existing.planned_count = planned
                existing.drop_lowest = drop
            else:
                db.add(GradingPolicy(
                    course_offering_id=offering.id,
                    component_type=atype,
                    planned_count=planned,
                    drop_lowest=drop,
                ))
        db.commit()
        course = offering.course
        from app.modules.activity.logger import log_activity
        log_activity(
            db, user_id, "policy_updated",
            f"updated grading policies for {course.course_code} — {course.title}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(offering.id),
            link=f"/instructor/courses/{offering.id}",
        )
        return self.get_grading_policies(db, user_id, offering_id)

    # ── Assessments ────────────────────────────────────────────────

    def list_assessments(self, db: Session, user_id: str, offering_id: str, role: str) -> list:
        if role == "instructor":
            offering = self._get_owned_offering(db, user_id, offering_id)
            published_only = False
        else:
            _, offering, _ = self._get_enrolled_offering(db, user_id, offering_id)
            published_only = True

        self._compact_multi_assessment_sequences(db, offering.id)
        query = db.query(Assessment).filter(Assessment.course_offering_id == offering.id)
        if published_only:
            query = query.filter(Assessment.is_published == True)
        assessments = sorted(query.all(), key=self._assessment_sort_key)
        return [self._serialize_assessment(a) for a in assessments]

    def create_assessment(self, db: Session, user_id: str, offering_id: str, data) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        atype = data.type.value if hasattr(data.type, "value") else data.type
        active = active_components(offering.course.marks_distribution)
        if atype not in active:
            raise AssessmentValidationException(f"Component '{atype}' has weight 0 for this course")

        existing = (
            db.query(Assessment)
            .filter(Assessment.course_offering_id == offering.id, Assessment.type == atype)
            .all()
        )

        if atype in FIXED_SINGLETON_TYPES and len(existing) >= 1:
            raise AssessmentValidationException(f"Only one {atype} assessment is allowed per course")

        policy = (
            db.query(GradingPolicy)
            .filter(GradingPolicy.course_offering_id == offering.id, GradingPolicy.component_type == atype)
            .first()
        )
        if atype in MULTI_TYPES and policy and len(existing) >= policy.planned_count:
            raise AssessmentValidationException(
                f"Planned count for {atype} is {policy.planned_count}. Update grading policy to add more."
            )

        self._compact_multi_assessment_sequences(db, offering.id, commit=False)
        existing = (
            db.query(Assessment)
            .filter(Assessment.course_offering_id == offering.id, Assessment.type == atype)
            .all()
        )

        seq = data.sequence_number
        if seq is None:
            seq = len(existing) + 1 if atype in MULTI_TYPES else 1

        due = None
        if data.due_date:
            due = datetime.strptime(data.due_date, "%Y-%m-%d").date()

        window_start = _parse_assessment_datetime(data.window_start)
        window_end = _parse_assessment_datetime(data.window_end)

        assessment = Assessment(
            course_offering_id=offering.id,
            title=data.title,
            type=AssessmentType(atype),
            total_marks=data.total_marks,
            weightage=active.get(atype),
            due_date=due,
            sequence_number=seq,
            form_url=data.form_url,
            description=data.description,
            window_start=window_start,
            window_end=window_end,
            is_published=bool(data.is_published),
        )
        db.add(assessment)
        db.commit()
        db.refresh(assessment)

        if assessment.is_published:
            course = offering.course
            self._notify_enrolled_students(
                db, offering,
                title=f"New {atype}: {assessment.title}",
                message=f"A new {atype} has been published for {course.course_code} — {course.title}.",
                link=f"/student/my-courses/{offering.id}",
            )

        course = offering.course
        from app.modules.activity.logger import log_activity
        action = "assessment_published" if assessment.is_published else "assessment_created"
        verb = "published" if assessment.is_published else "created"
        log_activity(
            db, user_id, action,
            f"{verb} {assessment.title} for {course.course_code} — {course.title}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(offering.id),
            link=f"/instructor/courses/{offering.id}",
        )

        return self._serialize_assessment(assessment)

    def update_assessment(self, db: Session, user_id: str, assessment_id: str, data) -> dict:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise AssessmentNotFoundException()
        offering = self._get_owned_offering(db, user_id, str(assessment.course_offering_id))

        was_published = bool(assessment.is_published)
        if data.title is not None:
            assessment.title = data.title
        if data.total_marks is not None:
            if data.total_marks <= 0:
                raise AssessmentValidationException("total_marks must be > 0")
            assessment.total_marks = data.total_marks
        if data.due_date is not None:
            assessment.due_date = datetime.strptime(data.due_date, "%Y-%m-%d").date() if data.due_date else None
        if data.sequence_number is not None:
            assessment.sequence_number = data.sequence_number
        if data.form_url is not None:
            assessment.form_url = data.form_url
        if data.description is not None:
            assessment.description = data.description
        if data.window_start is not None:
            assessment.window_start = _parse_assessment_datetime(data.window_start)
        if data.window_end is not None:
            assessment.window_end = _parse_assessment_datetime(data.window_end)
        if data.is_published is not None:
            assessment.is_published = data.is_published

        db.commit()
        db.refresh(assessment)

        if assessment.is_published and not was_published:
            course = offering.course
            atype = assessment.type.value if hasattr(assessment.type, "value") else assessment.type
            self._notify_enrolled_students(
                db, offering,
                title=f"New {atype}: {assessment.title}",
                message=f"A new {atype} has been published for {course.course_code} — {course.title}.",
                link=f"/student/my-courses/{offering.id}",
            )
            from app.modules.activity.logger import log_activity
            log_activity(
                db, user_id, "assessment_published",
                f"published {assessment.title} for {course.course_code} — {course.title}",
                course_code=course.course_code,
                course_title=course.title,
                offering_id=str(offering.id),
                link=f"/instructor/courses/{offering.id}",
            )
        else:
            course = offering.course
            from app.modules.activity.logger import log_activity
            log_activity(
                db, user_id, "assessment_updated",
                f"updated {assessment.title} for {course.course_code} — {course.title}",
                course_code=course.course_code,
                course_title=course.title,
                offering_id=str(offering.id),
                link=f"/instructor/courses/{offering.id}",
            )

        return self._serialize_assessment(assessment)

    def delete_assessment(self, db: Session, user_id: str, assessment_id: str) -> dict:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise AssessmentNotFoundException()
        self._get_owned_offering(db, user_id, str(assessment.course_offering_id))
        offering_id = assessment.course_offering_id
        atype = self._assessment_type_value(assessment)
        db.delete(assessment)
        db.flush()
        self._compact_multi_assessment_sequences(db, offering_id, commit=False)
        db.commit()
        return {"message": "Assessment deleted"}

    def set_assessment_file(self, db: Session, user_id: str, assessment_id: str, file_url: str) -> dict:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise AssessmentNotFoundException()
        offering = self._get_owned_offering(db, user_id, str(assessment.course_offering_id))
        assessment.file_url = file_url
        db.commit()
        db.refresh(assessment)
        course = offering.course
        from app.modules.activity.logger import log_activity
        log_activity(
            db, user_id, "assessment_file_uploaded",
            f"uploaded file for {assessment.title} in {course.course_code} — {course.title}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(assessment.course_offering_id),
            link=f"/instructor/courses/{assessment.course_offering_id}",
        )
        return self._serialize_assessment(assessment)

    # ── Grades ─────────────────────────────────────────────────────

    def get_assessment_grades(self, db: Session, user_id: str, assessment_id: str) -> dict:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise AssessmentNotFoundException()
        offering = self._get_owned_offering(db, user_id, str(assessment.course_offering_id))

        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .all()
        )
        grades = db.query(Grade).filter(Grade.assessment_id == assessment.id).all()
        grade_map = {str(g.student_id): g for g in grades}

        rows = []
        for enr in enrollments:
            s = enr.student
            g = grade_map.get(str(s.id)) if s else None
            rows.append({
                "student_uuid": str(s.id) if s else None,
                "student_id": s.student_id if s else None,
                "student_name": f"{s.first_name} {s.last_name}" if s else "Unknown",
                "marks_obtained": g.marks_obtained if g else None,
                "grade_id": str(g.id) if g else None,
            })

        return {
            "assessment": self._serialize_assessment(assessment),
            "students": rows,
        }

    def upsert_grades(self, db: Session, user_id: str, assessment_id: str, entries: list, notify: bool = False) -> dict:
        assessment = db.query(Assessment).filter(Assessment.id == assessment_id).first()
        if not assessment:
            raise AssessmentNotFoundException()
        offering = self._get_owned_offering(db, user_id, str(assessment.course_offering_id))
        exam_max = assessment.total_marks or 0

        updated = 0
        created = 0
        errors = []

        for entry in entries:
            sid = entry.student_id if hasattr(entry, "student_id") else entry["student_id"]
            marks = entry.marks_obtained if hasattr(entry, "marks_obtained") else entry.get("marks_obtained")

            student = self._resolve_student(db, str(offering.id), sid)
            if not student:
                errors.append({"student_id": sid, "reason": "Student not enrolled or not found"})
                continue
            if marks is not None:
                try:
                    marks = float(marks)
                except (TypeError, ValueError):
                    errors.append({"student_id": sid, "reason": "Invalid marks value"})
                    continue
                if marks < 0 or (exam_max and marks > exam_max):
                    errors.append({"student_id": sid, "reason": f"Marks must be between 0 and {exam_max}"})
                    continue

            existing = (
                db.query(Grade)
                .filter(Grade.assessment_id == assessment.id, Grade.student_id == student.id)
                .first()
            )
            if existing:
                existing.marks_obtained = marks
                updated += 1
            else:
                db.add(Grade(assessment_id=assessment.id, student_id=student.id, marks_obtained=marks))
                created += 1

        db.commit()
        if notify and (created or updated):
            self._notify_students_grades(db, offering, assessment)
        if created or updated:
            course = offering.course
            from app.modules.activity.logger import log_activity
            verb = "published" if notify else "uploaded"
            log_activity(
                db, user_id, "grades_uploaded",
                f"{verb} grades for {assessment.title} in {course.course_code} — {course.title}",
                course_code=course.course_code,
                course_title=course.title,
                offering_id=str(offering.id),
                link=f"/instructor/courses/{offering.id}",
            )
        return {"created": created, "updated": updated, "errors": errors}

    def upsert_multi_grades(self, db: Session, user_id: str, offering_id: str, rows: list, notify: bool = False) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        active_list = self._active_assessments(db, offering)
        assessments = {str(a.id): a for a in active_list}
        col_map = self._column_map(active_list)

        created = updated = 0
        errors = []

        for row in rows:
            sid = row.student_id if hasattr(row, "student_id") else row["student_id"]
            marks_map = row.marks if hasattr(row, "marks") else row.get("marks", {})
            student = self._resolve_student(db, offering_id, sid)
            if not student:
                errors.append({"student_id": sid, "reason": "Student not enrolled or not found"})
                continue

            for col_key, marks in marks_map.items():
                aid = col_map.get(str(col_key).strip()) or col_map.get(str(col_key).strip().lower())
                if not aid:
                    errors.append({"student_id": sid, "column": str(col_key), "reason": "Unknown assessment column"})
                    continue
                assessment = assessments.get(aid)
                if not assessment:
                    errors.append({"student_id": sid, "column": str(col_key), "reason": "Assessment not active for this course"})
                    continue
                if marks is not None and marks != "":
                    try:
                        marks = float(marks)
                    except (TypeError, ValueError):
                        errors.append({"student_id": sid, "column": str(col_key), "reason": "Invalid marks"})
                        continue
                    exam_max = assessment.total_marks or 0
                    if marks < 0 or (exam_max and marks > exam_max):
                        errors.append({
                            "student_id": sid,
                            "column": str(col_key),
                            "reason": f"Marks must be between 0 and {exam_max}",
                        })
                        continue
                else:
                    marks = None

                existing = (
                    db.query(Grade)
                    .filter(Grade.assessment_id == assessment.id, Grade.student_id == student.id)
                    .first()
                )
                if existing:
                    existing.marks_obtained = marks
                    updated += 1
                else:
                    db.add(Grade(assessment_id=assessment.id, student_id=student.id, marks_obtained=marks))
                    created += 1

        db.commit()
        if notify and (created or updated):
            self._notify_students_grades(db, offering)
        if created or updated:
            course = offering.course
            from app.modules.activity.logger import log_activity
            verb = "published" if notify else "uploaded"
            log_activity(
                db, user_id, "grades_uploaded",
                f"{verb} gradebook grades for {course.course_code} — {course.title}",
                course_code=course.course_code,
                course_title=course.title,
                offering_id=str(offering.id),
                link=f"/instructor/courses/{offering.id}",
            )
        return {"created": created, "updated": updated, "errors": errors}

    def clear_all_grades(self, db: Session, user_id: str, offering_id: str) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        active_list = self._active_assessments(db, offering)
        ids = [a.id for a in active_list]
        if not ids:
            return {"deleted": 0}
        deleted = (
            db.query(Grade)
            .filter(Grade.assessment_id.in_(ids))
            .delete(synchronize_session=False)
        )
        db.commit()
        return {"deleted": deleted}

    def csv_template_single(self, db: Session, user_id: str, assessment_id: str) -> str:
        data = self.get_assessment_grades(db, user_id, assessment_id)
        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["student_id", "student_name", "marks_obtained"])
        for row in data["students"]:
            writer.writerow([
                row["student_id"] or "",
                row["student_name"] or "",
                "" if row["marks_obtained"] is None else row["marks_obtained"],
            ])
        return output.getvalue()

    def csv_template_multi(self, db: Session, user_id: str, offering_id: str) -> str:
        offering = self._get_owned_offering(db, user_id, offering_id)
        assessments = self._active_assessments(db, offering)
        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .all()
        )
        grades = (
            db.query(Grade)
            .filter(Grade.assessment_id.in_([a.id for a in assessments]))
            .all()
        ) if assessments else []
        grade_map = {(str(g.student_id), str(g.assessment_id)): g.marks_obtained for g in grades}

        slugs = [self._assessment_slug(a) for a in assessments]
        headers = ["student_id", "student_name"] + slugs
        title_row = ["", ""] + [a.title for a in assessments]

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(headers)
        writer.writerow(title_row)
        for enr in enrollments:
            s = enr.student
            if not s:
                continue
            row = [s.student_id, f"{s.first_name} {s.last_name}"]
            for a in assessments:
                val = grade_map.get((str(s.id), str(a.id)))
                row.append("" if val is None else val)
            writer.writerow(row)
        return output.getvalue()

    def import_csv_single(self, db: Session, user_id: str, assessment_id: str, content: str, notify: bool = False) -> dict:
        reader = csv.DictReader(io.StringIO(content))
        if not reader.fieldnames:
            raise GradeImportException("CSV has no header row")
        fields = {f.strip().lower(): f for f in reader.fieldnames}
        sid_col = fields.get("student_id") or fields.get("id") or fields.get("roll")
        marks_col = fields.get("marks_obtained") or fields.get("marks") or fields.get("score")
        if not sid_col or not marks_col:
            raise GradeImportException("CSV must include student_id and marks_obtained columns")

        entries = []
        for row in reader:
            sid = (row.get(sid_col) or "").strip()
            if not sid:
                continue
            raw = (row.get(marks_col) or "").strip()
            marks = None if raw == "" or raw.upper() in ("ABS", "NA", "-") else raw
            entries.append({"student_id": sid, "marks_obtained": marks})

        return self.upsert_grades(db, user_id, assessment_id, entries, notify=notify)

    def import_csv_multi(self, db: Session, user_id: str, offering_id: str, content: str, notify: bool = False) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        active_list = self._active_assessments(db, offering)
        col_map = self._column_map(active_list)

        lines = content.splitlines()
        if not lines:
            raise GradeImportException("Empty CSV")

        reader = csv.reader(io.StringIO(content))
        rows = list(reader)
        if len(rows) < 1:
            raise GradeImportException("CSV has no header")

        header = [h.strip() for h in rows[0]]
        data_start = 1
        if len(rows) > 1 and (not rows[1][0] or rows[1][0].strip() == ""):
            data_start = 2

        try:
            sid_idx = next(i for i, h in enumerate(header) if h.lower() in ("student_id", "id", "roll"))
        except StopIteration:
            raise GradeImportException("CSV must include student_id column")

        assessment_cols = []
        for i, h in enumerate(header):
            key = h.strip()
            if key.lower() in ("student_id", "student_name", "id", "roll", "name"):
                continue
            aid = col_map.get(key) or col_map.get(key.lower())
            if aid:
                assessment_cols.append((i, aid))

        if not assessment_cols:
            raise GradeImportException(
                "No assessment columns found. Use exact names from template: quiz_1, assignment_1, midterm, final, lab_1, attendance, etc."
            )

        import_rows = []
        for row in rows[data_start:]:
            if not row or len(row) <= sid_idx:
                continue
            sid = row[sid_idx].strip()
            if not sid:
                continue
            marks = {}
            for idx, aid in assessment_cols:
                raw = row[idx].strip() if idx < len(row) else ""
                marks[aid] = None if raw == "" or raw.upper() in ("ABS", "NA", "-") else raw
            import_rows.append({"student_id": sid, "marks": marks})

        return self.upsert_multi_grades(db, user_id, offering_id, import_rows, notify=notify)

    def _build_grade_context(self, db: Session, offering: CourseOffering) -> tuple[dict, dict, dict, list]:
        policies = {
            p.component_type: {"planned_count": p.planned_count, "drop_lowest": p.drop_lowest}
            for p in db.query(GradingPolicy).filter(GradingPolicy.course_offering_id == offering.id).all()
        }
        active = active_components(offering.course.marks_distribution)
        active_list = self._active_assessments(db, offering)
        by_type: dict[str, list] = {}
        columns = []
        for a in active_list:
            atype = a.type.value if hasattr(a.type, "value") else a.type
            row = {
                "id": str(a.id),
                "title": a.title,
                "type": atype,
                "csv_column": self._assessment_slug(a),
                "total_marks": a.total_marks,
                "sequence_number": a.sequence_number,
            }
            by_type.setdefault(atype, []).append(row)
            columns.append(row)
        # Only include policies/components with weight > 0
        filtered_by_type = {k: v for k, v in by_type.items() if k in active}
        return offering.course.marks_distribution, policies, filtered_by_type, columns

    def get_offering_gradebook(self, db: Session, user_id: str, offering_id: str) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        dist, policies, by_type, columns = self._build_grade_context(db, offering)
        active = active_components(dist)
        all_assessment_ids = [a["id"] for alist in by_type.values() for a in alist]

        enrollments = (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(Enrollment.course_offering_id == offering.id, Enrollment.status == "active")
            .all()
        )
        grades = (
            db.query(Grade).filter(Grade.assessment_id.in_(all_assessment_ids)).all()
            if all_assessment_ids else []
        )
        grades_lookup = {(str(g.student_id), str(g.assessment_id)): g.marks_obtained for g in grades}

        students = []
        for enr in enrollments:
            s = enr.student
            if not s:
                continue
            grades_by_a = {
                aid: grades_lookup.get((str(s.id), aid))
                for aid in all_assessment_ids
            }
            computed = compute_student_course_grade(dist, policies, by_type, grades_by_a)
            students.append({
                "student_uuid": str(s.id),
                "student_id": s.student_id,
                "student_name": f"{s.first_name} {s.last_name}",
                **computed,
            })

        component_order = [t for t in COMPONENT_ORDER if t in active]

        return {
            "offering_id": offering_id,
            "course_code": offering.course.course_code,
            "title": offering.course.title,
            "marks_distribution": dist,
            "active_components": active,
            "policies": policies,
            "assessments_by_type": by_type,
            "columns": columns,
            "component_order": component_order,
            "csv_columns": ["student_id", "student_name"] + [c["csv_column"] for c in columns],
            "students": students,
        }

    def get_student_grades_overview(self, db: Session, user_id: str) -> list:
        student = self._get_student(db, user_id)
        enrollments = (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.instructor),
            )
            .filter(Enrollment.student_id == student.id, Enrollment.status.in_(["active", "completed"]))
            .all()
        )
        result = []
        for enr in enrollments:
            offering = enr.course_offering
            dist, policies, by_type, _ = self._build_grade_context(db, offering)
            all_ids = [a["id"] for alist in by_type.values() for a in alist]
            grades = (
                db.query(Grade)
                .filter(Grade.student_id == student.id, Grade.assessment_id.in_(all_ids))
                .all()
            ) if all_ids else []
            grades_by_a = {str(g.assessment_id): g.marks_obtained for g in grades}
            computed = compute_student_course_grade(dist, policies, by_type, grades_by_a)
            instructor = offering.instructor
            result.append({
                "offering_id": str(offering.id),
                "course_id": str(offering.course.id),
                "course_code": offering.course.course_code,
                "title": offering.course.title,
                "instructor_name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
                "marks_distribution": dist,
                **computed,
            })
        return result

    def get_student_offering_grades(self, db: Session, user_id: str, offering_id: str) -> dict:
        student, offering, _ = self._get_enrolled_offering(db, user_id, offering_id)
        dist, policies, by_type, _ = self._build_grade_context(db, offering)
        all_ids = [a["id"] for alist in by_type.values() for a in alist]
        grades = (
            db.query(Grade)
            .filter(Grade.student_id == student.id, Grade.assessment_id.in_(all_ids))
            .all()
        ) if all_ids else []
        grades_by_a = {str(g.assessment_id): g.marks_obtained for g in grades}
        computed = compute_student_course_grade(dist, policies, by_type, grades_by_a)
        return {
            "offering_id": offering_id,
            "course_code": offering.course.course_code,
            "title": offering.course.title,
            "marks_distribution": dist,
            "policies": policies,
            **computed,
        }

    # ── Materials ──────────────────────────────────────────────────

    def list_materials(self, db: Session, user_id: str, offering_id: str, role: str) -> list:
        if role == "instructor":
            offering = self._get_owned_offering(db, user_id, offering_id)
        else:
            _, offering, _ = self._get_enrolled_offering(db, user_id, offering_id)

        materials = (
            db.query(CourseMaterial)
            .filter(CourseMaterial.course_offering_id == offering.id)
            .order_by(CourseMaterial.sort_order, CourseMaterial.created_at.desc())
            .all()
        )
        return [self._serialize_material(m) for m in materials]

    def _serialize_material(self, m: CourseMaterial) -> dict:
        return {
            "id": str(m.id),
            "course_offering_id": str(m.course_offering_id),
            "title": m.title,
            "description": m.description,
            "material_type": m.material_type.value if hasattr(m.material_type, "value") else m.material_type,
            "file_url": m.file_url,
            "external_url": m.external_url,
            "file_name": m.file_name,
            "sort_order": m.sort_order or 0,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }

    def create_material(self, db: Session, user_id: str, offering_id: str, data, file_url: str = None, file_name: str = None) -> dict:
        offering = self._get_owned_offering(db, user_id, offering_id)
        mtype = data.material_type.value if hasattr(data.material_type, "value") else data.material_type
        material = CourseMaterial(
            course_offering_id=offering.id,
            title=data.title,
            description=data.description,
            material_type=MaterialType(mtype),
            external_url=data.external_url,
            file_url=file_url,
            file_name=file_name,
            sort_order=data.sort_order or 0,
        )
        db.add(material)
        db.commit()
        db.refresh(material)

        course = offering.course
        self._notify_enrolled_students(
            db, offering,
            title=f"New material: {material.title}",
            message=f"New course content uploaded for {course.course_code} — {course.title}.",
            link=f"/student/my-courses/{offering.id}",
        )
        from app.modules.activity.logger import log_activity
        file_part = f" ({file_name})" if file_name else ""
        log_activity(
            db, user_id, "material_uploaded",
            f"uploaded {material.title}{file_part} for {course.course_code} — {course.title}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(offering.id),
            link=f"/instructor/courses/{offering.id}",
        )
        return self._serialize_material(material)

    def delete_material(self, db: Session, user_id: str, material_id: str) -> dict:
        material = db.query(CourseMaterial).filter(CourseMaterial.id == material_id).first()
        if not material:
            raise MaterialNotFoundException()
        self._get_owned_offering(db, user_id, str(material.course_offering_id))
        db.delete(material)
        db.commit()
        return {"message": "Material deleted"}

    # ── Notifications ──────────────────────────────────────────────

    def list_notifications(self, db: Session, user_id: str, unread_only: bool = False) -> list:
        q = db.query(Notification).filter(Notification.user_id == user_id)
        if unread_only:
            q = q.filter(Notification.is_read == False)
        notes = q.order_by(Notification.created_at.desc()).limit(50).all()
        return [{
            "id": str(n.id),
            "title": n.title,
            "message": n.message,
            "link": n.link,
            "is_read": bool(n.is_read),
            "created_at": n.created_at.isoformat() if n.created_at else None,
        } for n in notes]

    def mark_notification_read(self, db: Session, user_id: str, notification_id: str) -> dict:
        n = db.query(Notification).filter(Notification.id == notification_id, Notification.user_id == user_id).first()
        if not n:
            raise CourseNotFoundException("Notification not found")
        n.is_read = True
        db.commit()
        return {"id": str(n.id), "is_read": True}
