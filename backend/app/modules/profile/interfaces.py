from abc import ABC, abstractmethod
from uuid import UUID
from typing import BinaryIO
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.user import User
from app.modules.profile.schema import StudentProfileUpdate, InstructorProfileUpdate


class IProfileRepository(ABC):
    @abstractmethod
    def get_student_by_user_id(self, user_id: UUID) -> Student | None:
        pass

    @abstractmethod
    def get_instructor_by_user_id(self, user_id: UUID) -> Instructor | None:
        pass

    @abstractmethod
    def update_student(self, student: Student, data: StudentProfileUpdate) -> Student:
        pass

    @abstractmethod
    def update_instructor(self, instructor: Instructor, data: InstructorProfileUpdate) -> Instructor:
        pass

    @abstractmethod
    def update_profile_photo(self, user: User, photo_url: str) -> None:
        pass


class IStorageProvider(ABC):
    @abstractmethod
    async def upload(self, file: BinaryIO, filename: str) -> str:
        pass

    @abstractmethod
    async def delete(self, path: str) -> None:
        pass

    @abstractmethod
    def get_url(self, path: str) -> str:
        pass


class IProfileService(ABC):
    @abstractmethod
    def get_student_profile(self, user: User) -> Student:
        pass

    @abstractmethod
    def get_instructor_profile(self, user: User) -> Instructor:
        pass

    @abstractmethod
    def update_student_profile(self, user: User, data: StudentProfileUpdate) -> Student:
        pass

    @abstractmethod
    def update_instructor_profile(self, user: User, data: InstructorProfileUpdate) -> Instructor:
        pass

    @abstractmethod
    async def upload_profile_photo(self, user: User, file: BinaryIO, filename: str) -> str:
        pass
