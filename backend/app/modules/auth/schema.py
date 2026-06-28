from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime
from app.models.enums import UserRole

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str
    role: UserRole
    id: UUID
    email: EmailStr

class TokenData(BaseModel):
    email: str | None = None
    role: UserRole | None = None

class UserBase(BaseModel):
    email: EmailStr
    role: UserRole

class UserCreate(UserBase):
    password: str

class UserResponse(UserBase):
    id: UUID
    is_active: bool
    created_at: datetime
    updated_at: datetime | None = None

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class RefreshRequest(BaseModel):
    refresh_token: str

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    role: UserRole

    first_name: str
    last_name: str
    phone: str | None = None
    address: str | None = None

    student_id: str | None = None
    employee_id: str | None = None
    designation: str | None = None

    @field_validator("student_id")
    @classmethod
    def validate_student_id(cls, v, info):
        if v is not None and not (v.isdigit() and len(v) == 8):
            raise ValueError("Student ID must be exactly 8 digits")
        return v

    @field_validator("employee_id")
    @classmethod
    def validate_employee_id(cls, v, info):
        if v is not None and not (v.isdigit() and len(v) == 8):
            raise ValueError("Employee ID must be exactly 8 digits")
        return v
