from pydantic import BaseModel, EmailStr, field_validator
from uuid import UUID
from datetime import datetime
from app.models.enums import UserRole

class Token(BaseModel):
    access_token: str
    refresh_token: str
    token_type: str

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

    class Config:
        from_attributes = True

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

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
    department_code: str | None = None
    degree_level: str | None = None
    program_id: str | None = None
    enrolled_semester: str | None = None
    current_semester: str | None = None
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

    @field_validator("degree_level")
    @classmethod
    def validate_degree_level(cls, v, info):
        if v is not None:
            allowed = {"undergraduate", "postgraduate"}
            values = [x.strip() for x in v.split(",")]
            for val in values:
                if val not in allowed:
                    raise ValueError(f"Degree level must be one of: {', '.join(allowed)}")
        return v

    @field_validator("enrolled_semester", "current_semester")
    @classmethod
    def validate_semester(cls, v, info):
        if v is not None:
            allowed_seasons = ["spring", "summer", "fall"]
            v_lower = v.lower().replace(" ", "")
            if not any(v_lower.startswith(s) for s in allowed_seasons) or not any(c.isdigit() for c in v):
                raise ValueError("Semester must be like 'Spring 25', 'Summer 26', 'Fall 25'")
        return v
