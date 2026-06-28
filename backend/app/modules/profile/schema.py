from pydantic import BaseModel
from uuid import UUID
from datetime import datetime


class StudentProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    student_id: str
    first_name: str
    last_name: str
    phone: str | None
    address: str | None
    profile_photo: str | None
    email: str
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class InstructorProfileResponse(BaseModel):
    id: UUID
    user_id: UUID
    employee_id: str
    first_name: str
    last_name: str
    designation: str | None
    phone: str | None
    address: str | None
    profile_photo: str | None
    email: str
    created_at: datetime
    updated_at: datetime | None

    class Config:
        from_attributes = True


class StudentProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    address: str | None = None
    student_id: str | None = None


class InstructorProfileUpdate(BaseModel):
    first_name: str | None = None
    last_name: str | None = None
    phone: str | None = None
    address: str | None = None
    employee_id: str | None = None
    designation: str | None = None
