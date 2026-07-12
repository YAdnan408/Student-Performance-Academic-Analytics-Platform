from abc import ABC, abstractmethod
from sqlalchemy.orm import Session
from typing import Optional
from datetime import date


class IAnalyticsRepository(ABC):
    @abstractmethod
    def get_attendance_for_student(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_attendance_for_offering(self, db: Session, offering_id: str) -> list:
        pass

    @abstractmethod
    def get_student_enrollments(self, db: Session, student_id: str) -> list:
        pass

    @abstractmethod
    def get_enrollments_by_offering(self, db: Session, offering_id: str) -> list:
        pass

    @abstractmethod
    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional:
        pass
