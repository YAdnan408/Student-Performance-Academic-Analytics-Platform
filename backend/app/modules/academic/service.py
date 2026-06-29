from sqlalchemy.orm import Session
from app.modules.academic.interfaces import IAcademicRepository
from app.modules.academic.exceptions import (
    CourseNotFoundException,
    AlreadyEnrolledException,
    StudentProfileNotFoundException,
    ScheduleClashException,
)
from app.models.user import User
from app.models.instructor import Instructor
from app.models.course_offering import CourseOffering
from app.models.course import Course
from app.models.enums import CourseStatus
from typing import Optional
import uuid
from datetime import date


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
                },
                "instructor_name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
            })
        return result

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
