from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from app.models.course import Course
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.instructor import Instructor
from app.models.student import Student
from app.models.attendance import Attendance
from typing import Optional
from datetime import date


class IAcademicRepository(ABC):
    @abstractmethod
    def get_all_courses(self, db: Session) -> list:
        pass

    @abstractmethod
    def get_course_by_id(self, db: Session, course_id: str) -> Optional[Course]:
        pass

    @abstractmethod
    def get_course_offering(self, db: Session, course_id: str) -> Optional[CourseOffering]:
        pass

    @abstractmethod
    def get_student_by_user_id(self, db: Session, user_id: str) -> Optional[Student]:
        pass

    @abstractmethod
    def get_enrollment(self, db: Session, student_id: str, course_offering_id: str) -> Optional[Enrollment]:
        pass

    @abstractmethod
    def check_student_enrolled(self, db: Session, user_id: str, course_id: str) -> bool:
        pass

    @abstractmethod
    def create_enrollment(self, db: Session, student_id: str, course_offering_id: str) -> Enrollment:
        pass

    @abstractmethod
    def create_payment(self, db: Session, enrollment_id: str, amount: float, method: str, transaction_id: str) -> Payment:
        pass

    @abstractmethod
    def get_student_enrollments(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_student_enrollments_with_courses(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional[Instructor]:
        pass

    @abstractmethod
    def get_offering_by_id(self, db: Session, offering_id: str) -> Optional[CourseOffering]:
        pass

    @abstractmethod
    def get_enrollment_by_id(self, db: Session, enrollment_id: str) -> Optional[Enrollment]:
        pass

    @abstractmethod
    def get_student_by_id(self, db: Session, student_id: str) -> Optional[Student]:
        pass

    @abstractmethod
    def get_attendance(self, db: Session, enrollment_id: str, attendance_date: date) -> Optional[Attendance]:
        pass

    @abstractmethod
    def create_attendance(self, db: Session, enrollment_id: str, attendance_date: date, status: str, marked_by: str) -> Attendance:
        pass

    @abstractmethod
    def update_attendance(self, db: Session, attendance_id: str, status: str) -> Optional[Attendance]:
        pass

    @abstractmethod
    def get_attendance_by_id(self, db: Session, attendance_id: str) -> Optional[Attendance]:
        pass

    @abstractmethod
    def get_attendance_for_enrollment(self, db: Session, enrollment_id: str) -> list:
        pass

    @abstractmethod
    def get_attendance_for_student(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_enrollments_by_offering(self, db: Session, offering_id: str) -> list:
        pass
