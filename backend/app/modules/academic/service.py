from sqlalchemy.orm import Session
from sqlalchemy import func, extract
from app.modules.academic.interfaces import IAcademicRepository
from app.modules.academic.exceptions import (
    CourseNotFoundException,
    AlreadyEnrolledException,
    StudentProfileNotFoundException,
    ScheduleClashException,
    InstructorNotAssignedException,
    EnrollmentNotFoundException,
    AttendanceAlreadyMarkedException,
    AttendanceNotFoundException,
    InstructorProfileNotFoundException,
)
from app.models.user import User
from app.models.instructor import Instructor
from app.models.course_offering import CourseOffering
from app.models.course import Course
from app.models.enrollment import Enrollment
from app.models.enums import CourseStatus
from app.models.attendance import Attendance
from typing import Optional
import uuid
from datetime import date, datetime


class AcademicService:
    def __init__(self, repository: IAcademicRepository):
        self.repository = repository

    @staticmethod
    def get_instructor_courses(db: Session, user_id: str) -> list:
        instructor = db.query(Instructor).filter(Instructor.user_id == user_id).first()
        if not instructor:
            return []

        offerings = db.query(CourseOffering).filter(
            CourseOffering.instructor_id == instructor.id
        ).all()

        result = []
        for offering in offerings:
            course = offering.course
            semester = offering.semester
            enrolled_count = len(offering.enrollments) if offering.enrollments else 0
            result.append({
                "id": str(course.id),
                "offering_id": str(offering.id),
                "course_code": course.course_code,
                "title": course.title,
                "description": course.description,
                "cost": course.cost,
                "duration": course.duration,
                "start_date": str(course.start_date) if course.start_date else None,
                "end_date": str(course.end_date) if course.end_date else None,
                "marks_distribution": course.marks_distribution,
                "class_schedule": course.class_schedule,
                "semester": semester.name if semester else None,
                "enrolled_students": enrolled_count,
            })
        return result

    def list_courses(self, db: Session) -> list:
        self._archive_expired_courses(db)
        courses = self.repository.get_all_courses(db)
        result = []
        for course in courses:
            if course.status != CourseStatus.active.value:
                continue
            offering = course.offerings[0] if course.offerings else None
            instructor_name = ""
            if offering and offering.instructor:
                instructor_name = f"{offering.instructor.first_name} {offering.instructor.last_name}"
            result.append({
                "id": str(course.id),
                "course_code": course.course_code,
                "title": course.title,
                "description": course.description,
                "cost": course.cost,
                "duration": course.duration,
                "start_date": str(course.start_date) if course.start_date else None,
                "end_date": str(course.end_date) if course.end_date else None,
                "marks_distribution": course.marks_distribution,
                "class_schedule": course.class_schedule,
                "instructor_name": instructor_name,
            })
        return result

    def get_course_detail(self, db: Session, course_id: str, user_id: Optional[str] = None) -> Optional[dict]:
        self._archive_expired_courses(db)
        course = self.repository.get_course_by_id(db, course_id)
        if not course:
            raise CourseNotFoundException()

        offering = course.offerings[0] if course.offerings else None
        instructor = offering.instructor if offering else None

        is_enrolled = False
        if user_id:
            is_enrolled = self.repository.check_student_enrolled(db, user_id, course_id)

        return {
            "id": str(course.id),
            "course_code": course.course_code,
            "title": course.title,
            "description": course.description,
            "cost": course.cost,
            "duration": course.duration,
            "start_date": str(course.start_date) if course.start_date else None,
            "end_date": str(course.end_date) if course.end_date else None,
            "marks_distribution": course.marks_distribution,
            "class_schedule": course.class_schedule,
            "status": course.status,
            "is_enrolled": is_enrolled,
            "instructor": {
                "name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
                "designation": instructor.designation if instructor else None,
                "employee_id": instructor.employee_id if instructor else None,
            } if instructor else None,
        }

    def check_schedule_clash(self, db: Session, user_id: str, course_id: str) -> dict:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        course = self.repository.get_course_by_id(db, course_id)
        if not course:
            raise CourseNotFoundException()

        if not course.class_schedule or not course.class_schedule.get("days") or not course.class_schedule.get("time_slot"):
            return {"has_clash": False, "conflicting_course": None}

        new_days = course.class_schedule["days"]
        new_time = course.class_schedule["time_slot"]

        active_enrollments = self.repository.get_student_enrollments_with_courses(db, str(student.id))
        for enrollment in active_enrollments:
            enrolled_course = enrollment.course_offering.course
            if not enrolled_course.class_schedule:
                continue
            if (enrolled_course.class_schedule.get("days") == new_days and
                enrolled_course.class_schedule.get("time_slot") == new_time):
                return {
                    "has_clash": True,
                    "conflicting_course": enrolled_course.title,
                    "conflicting_course_code": enrolled_course.course_code,
                    "days": new_days,
                    "time_slot": new_time,
                }

        return {"has_clash": False, "conflicting_course": None}

    def enroll_student(self, db: Session, user_id: str, course_id: str, payment_method: str) -> dict:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        course = self.repository.get_course_by_id(db, course_id)
        if not course:
            raise CourseNotFoundException()

        if course.status != CourseStatus.active.value:
            raise CourseNotFoundException("Course is not available for enrollment")

        offering = self.repository.get_course_offering(db, course_id)
        if not offering:
            raise CourseNotFoundException()

        existing = self.repository.get_enrollment(db, str(student.id), str(offering.id))
        if existing and existing.status not in ["dropped", "completed"]:
            raise AlreadyEnrolledException()

        if course.class_schedule and course.class_schedule.get("days") and course.class_schedule.get("time_slot"):
            new_days = course.class_schedule["days"]
            new_time = course.class_schedule["time_slot"]
            active_enrollments = self.repository.get_student_enrollments_with_courses(db, str(student.id))
            for enrollment in active_enrollments:
                enrolled_course = enrollment.course_offering.course
                if not enrolled_course.class_schedule:
                    continue
                if (enrolled_course.class_schedule.get("days") == new_days and
                    enrolled_course.class_schedule.get("time_slot") == new_time):
                    raise ScheduleClashException(
                        f"Schedule clash: This course ({course.title}) conflicts with "
                        f"{enrolled_course.title} — both have {new_days}, {new_time}"
                    )

        enrollment = self.repository.create_enrollment(db, str(student.id), str(offering.id))

        transaction_id = f"TXN{uuid.uuid4().hex[:12].upper()}"
        payment = self.repository.create_payment(
            db, str(enrollment.id), course.cost or 0, payment_method, transaction_id
        )

        from app.modules.activity.logger import log_activity
        log_activity(
            db, user_id, "course_enrolled",
            f"enrolled in {course.course_code} — {course.title}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(offering.id),
            link=f"/student/my-courses/{offering.id}",
        )

        return {
            "enrollment_id": str(enrollment.id),
            "payment_id": str(payment.id),
            "transaction_id": transaction_id,
            "amount": payment.amount,
            "method": payment.method,
            "status": payment.status,
            "course_title": course.title,
        }

    def get_my_courses(self, db: Session, user_id: str) -> list:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        enrollments = self.repository.get_student_enrollments(db, str(student.id))
        result = []
        for enrollment in enrollments:
            co = enrollment.course_offering
            course = co.course
            instructor = co.instructor
            result.append({
                "enrollment_id": str(enrollment.id),
                "enrolled_at": str(enrollment.enrolled_at) if enrollment.enrolled_at else None,
                "offering_id": str(co.id),
                "course": {
                    "id": str(course.id),
                    "course_code": course.course_code,
                    "title": course.title,
                    "description": course.description,
                    "cost": course.cost,
                    "duration": course.duration,
                    "start_date": str(course.start_date) if course.start_date else None,
                    "end_date": str(course.end_date) if course.end_date else None,
                    "status": course.status,
                    "class_schedule": course.class_schedule,
                    "marks_distribution": course.marks_distribution,
                },
                "instructor_name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
            })
        return result

    def _get_instructor(self, db: Session, user_id: str) -> Instructor:
        instructor = self.repository.get_instructor_by_user_id(db, user_id)
        if not instructor:
            raise InstructorProfileNotFoundException()
        return instructor

    def _parse_date(self, date_str: str) -> date:
        return datetime.strptime(date_str, "%Y-%m-%d").date()

    def mark_attendance(self, db: Session, user_id: str, enrollment_id: str, attendance_date: str, status: str) -> dict:
        instructor = self._get_instructor(db, user_id)
        parsed_date = self._parse_date(attendance_date)

        enrollment = self.repository.get_enrollment_by_id(db, enrollment_id)
        if not enrollment:
            raise EnrollmentNotFoundException()

        offering = enrollment.course_offering
        if str(offering.instructor_id) != str(instructor.id):
            raise InstructorNotAssignedException()

        existing = self.repository.get_attendance(db, enrollment_id, parsed_date)
        if existing:
            raise AttendanceAlreadyMarkedException()

        record = self.repository.create_attendance(
            db, enrollment_id, parsed_date, status, str(instructor.id)
        )

        course = offering.course
        from app.modules.activity.logger import log_activity
        log_activity(
            db, user_id, "attendance_marked",
            f"marked attendance for {course.course_code} — {course.title} on {attendance_date}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=str(offering.id),
            link=f"/instructor/students/attendance/{offering.id}",
        )

        return {
            "id": str(record.id),
            "enrollment_id": str(record.enrollment_id),
            "date": str(record.date),
            "status": record.status,
        }

    def bulk_mark_attendance(self, db: Session, user_id: str, offering_id: str, attendance_date: str, records: list) -> dict:
        instructor = self._get_instructor(db, user_id)
        parsed_date = self._parse_date(attendance_date)

        offering = self.repository.get_offering_by_id(db, offering_id)
        if not offering:
            raise CourseNotFoundException("Course offering not found")

        if str(offering.instructor_id) != str(instructor.id):
            raise InstructorNotAssignedException()

        marked = 0
        skipped = 0
        errors = []

        for record in records:
            enrollment_id = record.get("enrollment_id") if isinstance(record, dict) else record.enrollment_id
            status = record.get("status") if isinstance(record, dict) else record.status

            enrollment = self.repository.get_enrollment_by_id(db, enrollment_id)
            if not enrollment:
                errors.append({"enrollment_id": enrollment_id, "error": "Enrollment not found"})
                continue

            if str(enrollment.course_offering_id) != offering_id:
                errors.append({"enrollment_id": enrollment_id, "error": "Enrollment does not belong to this offering"})
                continue

            existing = self.repository.get_attendance(db, enrollment_id, parsed_date)
            if existing:
                existing.status = status
                db.commit()
                marked += 1
                continue

            self.repository.create_attendance(
                db, enrollment_id, parsed_date, status, str(instructor.id)
            )
            marked += 1

        course = offering.course
        from app.modules.activity.logger import log_activity
        log_activity(
            db, user_id, "attendance_marked",
            f"marked attendance for {course.course_code} — {course.title} on {attendance_date}",
            course_code=course.course_code,
            course_title=course.title,
            offering_id=offering_id,
            link=f"/instructor/students/attendance/{offering_id}",
        )

        return {
            "total": len(records),
            "marked": marked,
            "skipped": skipped,
            "errors": errors,
        }

    def get_course_attendance_for_date(self, db: Session, user_id: str, offering_id: str, attendance_date: str) -> dict:
        instructor = self._get_instructor(db, user_id)
        parsed_date = self._parse_date(attendance_date)

        offering = self.repository.get_offering_by_id(db, offering_id)
        if not offering:
            raise CourseNotFoundException("Course offering not found")

        if str(offering.instructor_id) != str(instructor.id):
            raise InstructorNotAssignedException()

        enrollments = self.repository.get_enrollments_by_offering(db, offering_id)
        existing_records = self.repository.get_attendance_for_offering_and_date(db, offering_id, parsed_date)
        record_map = {str(r.enrollment_id): r.status for r in existing_records}

        students = []
        for enrollment in enrollments:
            student = enrollment.student
            students.append({
                "enrollment_id": str(enrollment.id),
                "student_id": str(student.id) if student else None,
                "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
                "student_code": student.student_id if student else None,
                "status": record_map.get(str(enrollment.id), None),
            })

        return {
            "offering_id": offering_id,
            "date": attendance_date,
            "has_existing": len(existing_records) > 0,
            "students": students,
        }

    def edit_attendance(self, db: Session, user_id: str, attendance_id: str, status: str) -> dict:
        instructor = self._get_instructor(db, user_id)

        record = self.repository.get_attendance_by_id(db, attendance_id)
        if not record:
            raise AttendanceNotFoundException()

        if str(record.marked_by) != str(instructor.id):
            raise InstructorNotAssignedException()

        updated = self.repository.update_attendance(db, attendance_id, status)

        return {
            "id": str(updated.id),
            "enrollment_id": str(updated.enrollment_id),
            "date": str(updated.date),
            "status": updated.status,
        }

    def get_course_attendance(self, db: Session, user_id: str, offering_id: str) -> dict:
        instructor = self._get_instructor(db, user_id)

        offering = self.repository.get_offering_by_id(db, offering_id)
        if not offering:
            raise CourseNotFoundException("Course offering not found")

        if str(offering.instructor_id) != str(instructor.id):
            raise InstructorNotAssignedException()

        enrollments = self.repository.get_enrollments_by_offering(db, offering_id)
        course = offering.course
        students_data = []

        total_classes_for_course = 0
        overall_present = 0
        overall_absent = 0
        overall_late = 0

        for enrollment in enrollments:
            records = self.repository.get_attendance_for_enrollment(db, str(enrollment.id))
            present = sum(1 for r in records if r.status == "present")
            absent = sum(1 for r in records if r.status == "absent")
            late = sum(1 for r in records if r.status == "late")
            total = len(records)
            percentage = ((present + late) / total * 100) if total > 0 else 0

            student = enrollment.student
            students_data.append({
                "enrollment_id": str(enrollment.id),
                "student_id": str(student.id) if student else None,
                "student_name": f"{student.first_name} {student.last_name}" if student else "Unknown",
                "student_code": student.student_id if student else None,
                "total_classes": total,
                "present": present,
                "absent": absent,
                "late": late,
                "percentage": round(percentage, 1),
            })

            if total > total_classes_for_course:
                total_classes_for_course = total
            overall_present += present
            overall_absent += absent
            overall_late += late

        total_all = overall_present + overall_absent + overall_late
        class_percentage = ((overall_present + overall_late) / total_all * 100) if total_all > 0 else 0

        return {
            "course_id": str(course.id),
            "course_title": course.title,
            "course_code": course.course_code,
            "offering_id": offering_id,
            "total_students": len(enrollments),
            "class_average_percentage": round(class_percentage, 1),
            "total_classes_recorded": total_classes_for_course,
            "students": students_data,
        }

    def get_my_attendance(self, db: Session, user_id: str) -> dict:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        enrollments = self.repository.get_student_enrollments(db, str(student.id))
        all_records = self.repository.get_attendance_for_student(db, str(student.id))

        total_present = 0
        total_absent = 0
        total_late = 0
        course_wise = []

        for enrollment in enrollments:
            course = enrollment.course_offering.course
            records = [r for r in all_records if str(r.enrollment_id) == str(enrollment.id)]
            present = sum(1 for r in records if r.status == "present")
            absent = sum(1 for r in records if r.status == "absent")
            late = sum(1 for r in records if r.status == "late")
            total = len(records)
            percentage = ((present + late) / total * 100) if total > 0 else 0

            total_present += present
            total_absent += absent
            total_late += late

            course_wise.append({
                "course_id": str(course.id),
                "course_title": course.title,
                "course_code": course.course_code,
                "offering_id": str(enrollment.course_offering_id),
                "total_classes": total,
                "present": present,
                "absent": absent,
                "late": late,
                "percentage": round(percentage, 1),
            })

        grand_total = total_present + total_absent + total_late
        overall_percentage = ((total_present + total_late) / grand_total * 100) if grand_total > 0 else 0

        monthly_map = {}
        for record in all_records:
            month_key = record.date.strftime("%Y-%m")
            if month_key not in monthly_map:
                monthly_map[month_key] = {"total": 0, "present": 0, "absent": 0, "late": 0}
            monthly_map[month_key]["total"] += 1
            if record.status == "present":
                monthly_map[month_key]["present"] += 1
            elif record.status == "absent":
                monthly_map[month_key]["absent"] += 1
            elif record.status == "late":
                monthly_map[month_key]["late"] += 1

        monthly_trend = []
        for month_key in sorted(monthly_map.keys()):
            m = monthly_map[month_key]
            pct = ((m["present"] + m["late"]) / m["total"] * 100) if m["total"] > 0 else 0
            monthly_trend.append({
                "month": month_key,
                "percentage": round(pct, 1),
            })

        recent_records = []
        for record in all_records[:20]:
            enrollment = next((e for e in enrollments if str(e.id) == str(record.enrollment_id)), None)
            course_title = enrollment.course_offering.course.title if enrollment else "Unknown"
            course_code = enrollment.course_offering.course.course_code if enrollment else "Unknown"
            recent_records.append({
                "id": str(record.id),
                "date": str(record.date),
                "status": record.status,
                "course_title": course_title,
                "course_code": course_code,
            })

        return {
            "overall_percentage": round(overall_percentage, 1),
            "total_classes": grand_total,
            "present_count": total_present,
            "absent_count": total_absent,
            "late_count": total_late,
            "course_wise": course_wise,
            "monthly_trend": monthly_trend,
            "recent_records": recent_records,
        }

    def get_student_attendance_for_course(self, db: Session, user_id: str, offering_id: str) -> dict:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        enrollment = None
        enrollments = self.repository.get_student_enrollments(db, str(student.id))
        for e in enrollments:
            if str(e.course_offering_id) == offering_id:
                enrollment = e
                break

        if not enrollment:
            raise EnrollmentNotFoundException("You are not enrolled in this course")

        records = self.repository.get_attendance_for_enrollment(db, str(enrollment.id))
        course = enrollment.course_offering.course

        present = sum(1 for r in records if r.status == "present")
        absent = sum(1 for r in records if r.status == "absent")
        late = sum(1 for r in records if r.status == "late")
        total = len(records)
        percentage = ((present + late) / total * 100) if total > 0 else 0

        return {
            "course_id": str(course.id),
            "course_title": course.title,
            "course_code": course.course_code,
            "enrollment_id": str(enrollment.id),
            "total_classes": total,
            "present": present,
            "absent": absent,
            "late": late,
            "percentage": round(percentage, 1),
            "records": [
                {
                    "id": str(r.id),
                    "date": str(r.date),
                    "status": r.status,
                }
                for r in records
            ],
        }

    def _archive_expired_courses(self, db: Session):
        today = date.today()
        expired_courses = db.query(Course).filter(
            Course.end_date < today,
            Course.status == CourseStatus.active.value
        ).all()
        for course in expired_courses:
            course.status = CourseStatus.archived.value
        if expired_courses:
            db.commit()
