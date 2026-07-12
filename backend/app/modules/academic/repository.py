from sqlalchemy.orm import Session, joinedload
from sqlalchemy import select
from app.models.course import Course
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.payment import Payment
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.attendance import Attendance
from app.modules.academic.interfaces import IAcademicRepository
from typing import Optional
from datetime import date


class AcademicRepository(IAcademicRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_all_courses(self, db: Session) -> list:
        return (
            db.query(Course)
            .options(joinedload(Course.offerings).joinedload(CourseOffering.instructor))
            .all()
        )

    def get_course_by_id(self, db: Session, course_id: str) -> Optional[Course]:
        return (
            db.query(Course)
            .options(joinedload(Course.offerings).joinedload(CourseOffering.instructor))
            .filter(Course.id == course_id)
            .first()
        )

    def get_course_offering(self, db: Session, course_id: str) -> Optional[CourseOffering]:
        return (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.instructor))
            .options(joinedload(CourseOffering.course))
            .filter(CourseOffering.course_id == course_id)
            .first()
        )

    def get_student_by_user_id(self, db: Session, user_id: str) -> Optional[Student]:
        return db.query(Student).filter(Student.user_id == user_id).first()

    def get_enrollment(self, db: Session, student_id: str, course_offering_id: str) -> Optional[Enrollment]:
        return (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student_id,
                Enrollment.course_offering_id == course_offering_id,
            )
            .first()
        )

    def check_student_enrolled(self, db: Session, user_id: str, course_id: str) -> bool:
        student = db.query(Student).filter(Student.user_id == user_id).first()
        if not student:
            return False
        offering = (
            db.query(CourseOffering)
            .filter(CourseOffering.course_id == course_id)
            .first()
        )
        if not offering:
            return False
        enrollment = (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student.id,
                Enrollment.course_offering_id == offering.id,
                Enrollment.status.in_(["active", "completed"]),
            )
            .first()
        )
        return enrollment is not None

    def create_enrollment(self, db: Session, student_id: str, course_offering_id: str) -> Enrollment:
        enrollment = Enrollment(
            student_id=student_id,
            course_offering_id=course_offering_id,
        )
        db.add(enrollment)
        db.commit()
        db.refresh(enrollment)
        return enrollment

    def create_payment(self, db: Session, enrollment_id: str, amount: float, method: str, transaction_id: str) -> Payment:
        payment = Payment(
            enrollment_id=enrollment_id,
            amount=amount,
            method=method,
            status="completed",
            transaction_id=transaction_id,
        )
        db.add(payment)
        db.commit()
        db.refresh(payment)
        return payment

    def get_student_enrollments(self, db: Session, student_id: str) -> list:
        return (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.course_offering)
                .joinedload(CourseOffering.course),
                joinedload(Enrollment.course_offering)
                .joinedload(CourseOffering.instructor),
            )
            .filter(Enrollment.student_id == student_id, Enrollment.status == "active")
            .all()
        )

    def get_student_enrollments_with_courses(self, db: Session, student_id: str) -> list:
        return (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.course_offering)
                .joinedload(CourseOffering.course),
            )
            .filter(Enrollment.student_id == student_id, Enrollment.status == "active")
            .all()
        )

    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional[Instructor]:
        return db.query(Instructor).filter(Instructor.user_id == user_id).first()

    def get_offering_by_id(self, db: Session, offering_id: str) -> Optional[CourseOffering]:
        return (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.course))
            .options(joinedload(CourseOffering.instructor))
            .filter(CourseOffering.id == offering_id)
            .first()
        )

    def get_enrollment_by_id(self, db: Session, enrollment_id: str) -> Optional[Enrollment]:
        return (
            db.query(Enrollment)
            .options(
                joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
                joinedload(Enrollment.student),
            )
            .filter(Enrollment.id == enrollment_id)
            .first()
        )

    def get_student_by_id(self, db: Session, student_id: str) -> Optional[Student]:
        return db.query(Student).filter(Student.id == student_id).first()

    def get_attendance(self, db: Session, enrollment_id: str, attendance_date: date) -> Optional[Attendance]:
        return (
            db.query(Attendance)
            .filter(
                Attendance.enrollment_id == enrollment_id,
                Attendance.date == attendance_date,
            )
            .first()
        )

    def create_attendance(self, db: Session, enrollment_id: str, attendance_date: date, status: str, marked_by: str) -> Attendance:
        record = Attendance(
            enrollment_id=enrollment_id,
            date=attendance_date,
            status=status,
            marked_by=marked_by,
        )
        db.add(record)
        db.commit()
        db.refresh(record)
        return record

    def update_attendance(self, db: Session, attendance_id: str, status: str) -> Optional[Attendance]:
        record = db.query(Attendance).filter(Attendance.id == attendance_id).first()
        if not record:
            return None
        record.status = status
        db.commit()
        db.refresh(record)
        return record

    def get_attendance_by_id(self, db: Session, attendance_id: str) -> Optional[Attendance]:
        return db.query(Attendance).filter(Attendance.id == attendance_id).first()

    def get_attendance_for_enrollment(self, db: Session, enrollment_id: str) -> list:
        return (
            db.query(Attendance)
            .filter(Attendance.enrollment_id == enrollment_id)
            .order_by(Attendance.date.desc())
            .all()
        )

    def get_attendance_for_student(self, db: Session, student_id: str) -> list:
        return (
            db.query(Attendance)
            .join(Enrollment, Attendance.enrollment_id == Enrollment.id)
            .filter(Enrollment.student_id == student_id)
            .order_by(Attendance.date.desc())
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

    def get_attendance_for_offering_and_date(self, db: Session, offering_id: str, attendance_date: date) -> list:
        return (
            db.query(Attendance)
            .join(Enrollment, Attendance.enrollment_id == Enrollment.id)
            .filter(
                Enrollment.course_offering_id == offering_id,
                Attendance.date == attendance_date,
            )
            .all()
        )
