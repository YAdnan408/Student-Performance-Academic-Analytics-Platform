from sqlalchemy.orm import Session
from app.modules.academic.interfaces import IAcademicRepository
from app.modules.academic.exceptions import (
    CourseNotFoundException,
    AlreadyEnrolledException,
    StudentProfileNotFoundException,
)
from app.models.user import User
from app.models.instructor import Instructor
from app.models.course_offering import CourseOffering
from typing import Optional
import uuid


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
                "credit_hours": course.credit_hours,
                "cost": course.cost,
                "duration": course.duration,
                "start_date": str(course.start_date) if course.start_date else None,
                "end_date": str(course.end_date) if course.end_date else None,
                "marks_distribution": course.marks_distribution,
                "section": offering.section,
                "semester": semester.name if semester else None,
                "enrolled_students": enrolled_count,
            })
        return result

    def list_courses(self, db: Session) -> list:
        courses = self.repository.get_all_courses(db)
        result = []
        for course in courses:
            offering = course.offerings[0] if course.offerings else None
            instructor_name = ""
            if offering and offering.instructor:
                instructor_name = f"{offering.instructor.first_name} {offering.instructor.last_name}"
            result.append({
                "id": str(course.id),
                "course_code": course.course_code,
                "title": course.title,
                "description": course.description,
                "credit_hours": course.credit_hours,
                "cost": course.cost,
                "duration": course.duration,
                "start_date": str(course.start_date) if course.start_date else None,
                "end_date": str(course.end_date) if course.end_date else None,
                "marks_distribution": course.marks_distribution,
                "department": course.department.name if course.department else None,
                "instructor_name": instructor_name,
            })
        return result

    def get_course_detail(self, db: Session, course_id: str) -> Optional[dict]:
        course = self.repository.get_course_by_id(db, course_id)
        if not course:
            raise CourseNotFoundException()

        offering = course.offerings[0] if course.offerings else None
        instructor = offering.instructor if offering else None

        return {
            "id": str(course.id),
            "course_code": course.course_code,
            "title": course.title,
            "description": course.description,
            "credit_hours": course.credit_hours,
            "cost": course.cost,
            "duration": course.duration,
            "start_date": str(course.start_date) if course.start_date else None,
            "end_date": str(course.end_date) if course.end_date else None,
            "marks_distribution": course.marks_distribution,
            "department": course.department.name if course.department else None,
            "instructor": {
                "name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
                "designation": instructor.designation if instructor else None,
                "employee_id": instructor.employee_id if instructor else None,
            } if instructor else None,
        }

    def enroll_student(self, db: Session, user_id: str, course_id: str, payment_method: str) -> dict:
        student = self.repository.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        offering = self.repository.get_course_offering(db, course_id)
        if not offering:
            raise CourseNotFoundException()

        existing = self.repository.get_enrollment(db, str(student.id), str(offering.id))
        if existing:
            raise AlreadyEnrolledException()

        enrollment = self.repository.create_enrollment(db, str(student.id), str(offering.id))

        course = offering.course
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
                    "credit_hours": course.credit_hours,
                    "cost": course.cost,
                    "duration": course.duration,
                    "start_date": str(course.start_date) if course.start_date else None,
                    "end_date": str(course.end_date) if course.end_date else None,
                },
                "instructor_name": f"{instructor.first_name} {instructor.last_name}" if instructor else None,
            })
        return result
