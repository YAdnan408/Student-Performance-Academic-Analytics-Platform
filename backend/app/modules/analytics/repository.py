from sqlalchemy.orm import Session, joinedload
from app.models.attendance import Attendance
from app.models.enrollment import Enrollment
from app.models.course_offering import CourseOffering
from app.models.instructor import Instructor
from app.models.student import Student
from app.models.course import Course
from app.modules.analytics.interfaces import IAnalyticsRepository
from typing import Optional


class AnalyticsRepository(IAnalyticsRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_attendance_for_student(self, db: Session, student_id: str) -> list:
        return (
            db.query(Attendance)
            .join(Enrollment, Attendance.enrollment_id == Enrollment.id)
            .filter(Enrollment.student_id == student_id)
            .order_by(Attendance.date.desc())
            .all()
        )

    def get_attendance_for_offering(self, db: Session, offering_id: str) -> list:
        return (
            db.query(Attendance)
            .join(Enrollment, Attendance.enrollment_id == Enrollment.id)
            .filter(Enrollment.course_offering_id == offering_id)
            .order_by(Attendance.date.desc())
            .all()
        )

    def get_student_enrollments(self, db: Session, student_id: str) -> list:
        return (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.instructor),
            )
            .filter(Enrollment.student_id == student_id, Enrollment.status == "active")
            .all()
        )

    def get_enrollments_by_offering(self, db: Session, offering_id: str) -> list:
        return (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.student),
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
            )
            .filter(
                Enrollment.course_offering_id == offering_id,
                Enrollment.status == "active",
            )
            .all()
        )

    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional[Instructor]:
        return db.query(Instructor).filter(Instructor.user_id == user_id).first()
