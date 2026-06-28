import os
import uuid
from typing import BinaryIO
from app.models.user import User
from app.models.student import Student
from app.models.instructor import Instructor
from app.modules.profile.interfaces import IProfileService, IProfileRepository, IStorageProvider
from app.modules.profile.schema import StudentProfileUpdate, InstructorProfileUpdate
from app.modules.profile.exceptions import ProfileNotFoundException, InvalidImageException


ALLOWED_EXTENSIONS = {".jpg", ".jpeg", ".png", ".gif", ".webp"}


class ProfileService(IProfileService):
    def __init__(self, repository: IProfileRepository, storage: IStorageProvider):
        self.repository = repository
        self.storage = storage

    def get_student_profile(self, user: User) -> Student:
        student = self.repository.get_student_by_user_id(user.id)
        if not student:
            raise ProfileNotFoundException("student")
        return student

    def get_instructor_profile(self, user: User) -> Instructor:
        instructor = self.repository.get_instructor_by_user_id(user.id)
        if not instructor:
            raise ProfileNotFoundException("instructor")
        return instructor

    def update_student_profile(self, user: User, data: StudentProfileUpdate) -> Student:
        student = self.get_student_profile(user)
        return self.repository.update_student(student, data)

    def update_instructor_profile(self, user: User, data: InstructorProfileUpdate) -> Instructor:
        instructor = self.get_instructor_profile(user)
        return self.repository.update_instructor(instructor, data)

    async def upload_profile_photo(self, user: User, file: BinaryIO, filename: str) -> str:
        ext = os.path.splitext(filename)[1].lower()
        if ext not in ALLOWED_EXTENSIONS:
            raise InvalidImageException()

        path = await self.storage.upload(file, filename)
        photo_url = self.storage.get_url(path)
        self.repository.update_profile_photo(user, photo_url)
        return photo_url
