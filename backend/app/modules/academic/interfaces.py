from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from app.models.course import Course
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.instructor import Instructor
from app.models.student import Student
from typing import Optional

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
    def create_enrollment(self, db: Session, student_id: str, course_offering_id: str) -> Enrollment:
        pass

    @abstractmethod
    def create_payment(self, db: Session, enrollment_id: str, amount: float, method: str, transaction_id: str) -> Payment:
        pass

    @abstractmethod
    def get_student_enrollments(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional[Instructor]:
        pass
