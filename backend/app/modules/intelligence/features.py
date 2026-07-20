"""Build ML/rule feature vectors from existing grades + attendance + GPA."""

from __future__ import annotations

from typing import Optional

from sqlalchemy.orm import Session, joinedload

from app.models.enrollment import Enrollment
from app.models.course_offering import CourseOffering
from app.models.student import Student
from app.modules.academic.grades_service import GradesService
from app.modules.academic.repository import AcademicRepository
from app.modules.academic.service import AcademicService
from app.modules.analytics.grade_analytics import compute_cgpa

# Fixed feature order for sklearn models — do not reorder without retraining.
FEATURE_KEYS = [
    "attendance_pct",
    "quiz_pct",
    "assignment_pct",
    "lab_pct",
    "midterm_pct",
    "final_pct",
    "attendance_comp_pct",
    "provisional_total",
    "scaled_total",
    "graded_weight_ratio",
    "prior_cgpa",
    "missing_quiz",
    "missing_assignment",
    "missing_lab",
    "missing_midterm",
    "missing_final",
    "missing_attendance",
]


COMPONENT_TYPES = ["quiz", "assignment", "lab", "midterm", "final", "attendance"]


def _comp_pct(computed: dict, atype: str) -> Optional[float]:
    comp = (computed.get("components") or {}).get(atype) or {}
    return comp.get("component_percentage")


def _vector_from_parts(
    *,
    computed: dict,
    attendance_pct: float,
    attendance_recorded: bool,
    prior_cgpa: Optional[float],
    course_code: str,
    course_title: str,
    offering_id: str,
    student_uuid: str,
    student_code: Optional[str] = None,
    student_name: Optional[str] = None,
) -> dict:
    quiz = _comp_pct(computed, "quiz")
    assignment = _comp_pct(computed, "assignment")
    lab = _comp_pct(computed, "lab")
    midterm = _comp_pct(computed, "midterm")
    final = _comp_pct(computed, "final")
    attendance_comp = _comp_pct(computed, "attendance")

    total_weight = float(computed.get("total_weight") or 0)
    graded_weight = float(computed.get("graded_weight") or 0)
    ratio = (graded_weight / total_weight) if total_weight > 0 else 0.0
    provisional = float(computed.get("total_marks") or 0)
    scaled = computed.get("scaled_total")
    scaled_val = float(scaled) if scaled is not None else provisional

    # Unmarked session attendance must not look like a real 0%.
    att_pct = float(attendance_pct or 0) if attendance_recorded else 0.0
    if attendance_comp is not None:
        att_comp_pct = float(attendance_comp)
    elif attendance_recorded:
        att_comp_pct = att_pct
    else:
        att_comp_pct = 0.0

    features = {
        "attendance_pct": att_pct,
        "quiz_pct": float(quiz) if quiz is not None else 0.0,
        "assignment_pct": float(assignment) if assignment is not None else 0.0,
        "lab_pct": float(lab) if lab is not None else 0.0,
        "midterm_pct": float(midterm) if midterm is not None else 0.0,
        "final_pct": float(final) if final is not None else 0.0,
        "attendance_comp_pct": att_comp_pct,
        "provisional_total": provisional,
        "scaled_total": scaled_val,
        "graded_weight_ratio": round(ratio, 4),
        "prior_cgpa": float(prior_cgpa) if prior_cgpa is not None else 0.0,
        "missing_quiz": 0.0 if quiz is not None else 1.0,
        "missing_assignment": 0.0 if assignment is not None else 1.0,
        "missing_lab": 0.0 if lab is not None else 1.0,
        "missing_midterm": 0.0 if midterm is not None else 1.0,
        "missing_final": 0.0 if final is not None else 1.0,
        "missing_attendance": 0.0 if attendance_recorded else 1.0,
    }

    label = None
    if computed.get("is_complete") and scaled is not None:
        gp = computed.get("grade_points")
        label = 1 if (scaled < 60 or (gp is not None and gp < 2.0)) else 0

    return {
        "student_uuid": student_uuid,
        "student_id": student_code,
        "student_name": student_name,
        "offering_id": offering_id,
        "course_code": course_code,
        "course_title": course_title,
        "features": features,
        "feature_vector": [features[k] for k in FEATURE_KEYS],
        "is_complete": bool(computed.get("is_complete")),
        "letter_grade": computed.get("letter_grade"),
        "grade_points": computed.get("grade_points"),
        "total_marks": computed.get("total_marks"),
        "scaled_total": computed.get("scaled_total"),
        "graded_weight": graded_weight,
        "total_weight": total_weight,
        "label": label,
        "components": computed.get("components") or {},
    }


class FeatureBuilder:
    def __init__(self) -> None:
        self._grades = GradesService()

    def _prior_cgpa(self, db: Session, user_id: str, exclude_offering_id: Optional[str] = None) -> Optional[float]:
        courses = self._grades.get_student_grades_overview(db, user_id)
        if exclude_offering_id:
            courses = [c for c in courses if c.get("offering_id") != exclude_offering_id]
        return compute_cgpa(courses)

    def _attendance_stats(self, db: Session, user_id: str, offering_id: str) -> tuple[float, bool]:
        """Return (percentage, has_recorded_sessions)."""
        try:
            academic = AcademicService(AcademicRepository(db))
            data = academic.get_student_attendance_for_course(db, user_id, offering_id)
            total = int(data.get("total_classes") or 0)
            if total <= 0:
                return 0.0, False
            return float(data.get("percentage") or 0), True
        except Exception:
            return 0.0, False

    def build_for_student_offering(self, db: Session, user_id: str, offering_id: str) -> dict:
        student, offering, _ = self._grades._get_enrolled_offering(db, user_id, offering_id)
        computed = self._grades.get_student_offering_grades(db, user_id, offering_id)
        attendance_pct, attendance_recorded = self._attendance_stats(db, user_id, offering_id)
        prior = self._prior_cgpa(db, user_id, exclude_offering_id=offering_id)
        return _vector_from_parts(
            computed=computed,
            attendance_pct=attendance_pct,
            attendance_recorded=attendance_recorded,
            prior_cgpa=prior,
            course_code=offering.course.course_code,
            course_title=offering.course.title,
            offering_id=offering_id,
            student_uuid=str(student.id),
            student_code=student.student_id,
            student_name=f"{student.first_name} {student.last_name}",
        )

    def build_for_offering(self, db: Session, instructor_user_id: str, offering_id: str) -> list[dict]:
        """Feature rows for every enrolled student in an instructor-owned offering."""
        gradebook = self._grades.get_offering_gradebook(db, instructor_user_id, offering_id)
        offering = self._grades._get_owned_offering(db, instructor_user_id, offering_id)
        academic = AcademicService(AcademicRepository(db))
        course_att = academic.get_course_attendance(db, instructor_user_id, offering_id)
        att_by_uuid: dict[str, tuple[float, bool]] = {}
        att_by_code: dict[str, tuple[float, bool]] = {}
        for row in course_att.get("students") or []:
            total = int(row.get("total_classes") or 0)
            recorded = total > 0
            pct = float(row.get("percentage") or 0) if recorded else 0.0
            info = (pct, recorded)
            if row.get("student_id"):
                att_by_uuid[str(row["student_id"])] = info
            if row.get("student_code"):
                att_by_code[str(row["student_code"])] = info

        rows = []
        for s in gradebook.get("students") or []:
            student_uuid = s.get("student_uuid")
            if not student_uuid:
                continue
            student = db.query(Student).filter(Student.id == student_uuid).first()
            if not student or not student.user_id:
                continue
            prior = self._prior_cgpa(db, str(student.user_id), exclude_offering_id=offering_id)
            att_info = att_by_uuid.get(str(student.id)) or att_by_code.get(str(student.student_id))
            if att_info:
                att, recorded = att_info
            else:
                att, recorded = 0.0, False
            rows.append(
                _vector_from_parts(
                    computed=s,
                    attendance_pct=att,
                    attendance_recorded=recorded,
                    prior_cgpa=prior,
                    course_code=gradebook.get("course_code") or offering.course.course_code,
                    course_title=gradebook.get("title") or offering.course.title,
                    offering_id=offering_id,
                    student_uuid=str(student.id),
                    student_code=student.student_id,
                    student_name=s.get("student_name"),
                )
            )
        return rows

    def build_training_corpus(self, db: Session) -> list[dict]:
        """All completed enrollments across offerings (for offline-ish train)."""
        enrollments = (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.student),
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.instructor),
            )
            .filter(Enrollment.status.in_(["active", "completed"]))
            .all()
        )
        corpus = []
        for enr in enrollments:
            student = enr.student
            offering = enr.course_offering
            if not student or not student.user_id or not offering:
                continue
            try:
                row = self.build_for_student_offering(db, str(student.user_id), str(offering.id))
            except Exception:
                continue
            if row.get("label") is not None:
                corpus.append(row)
        return corpus
