from uuid import UUID
from sqlalchemy.orm import Session
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.user import User
from app.modules.profile.interfaces import IProfileRepository
from app.modules.profile.schema import StudentProfileUpdate, InstructorProfileUpdate


class ProfileRepository(IProfileRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_student_by_user_id(self, user_id: UUID) -> Student | None:
        return self.db.query(Student).filter(Student.user_id == user_id).first()

    def get_instructor_by_user_id(self, user_id: UUID) -> Instructor | None:
        return self.db.query(Instructor).filter(Instructor.user_id == user_id).first()

    def update_student(self, student: Student, data: StudentProfileUpdate) -> Student:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(student, field, value)
        self.db.commit()
        self.db.refresh(student)
        return student

    def update_instructor(self, instructor: Instructor, data: InstructorProfileUpdate) -> Instructor:
        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(instructor, field, value)
        self.db.commit()
        self.db.refresh(instructor)
        return instructor

    def update_profile_photo(self, user: User, photo_url: str) -> None:
        if user.role == 'student':
            student = self.get_student_by_user_id(user.id)
            if student:
                student.profile_photo = photo_url
        elif user.role == 'instructor':
            instructor = self.get_instructor_by_user_id(user.id)
            if instructor:
                instructor.profile_photo = photo_url
        self.db.commit()
