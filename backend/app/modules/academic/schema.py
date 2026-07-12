from pydantic import BaseModel
from typing import Optional
from app.models.enums import AttendanceStatus


class EnrollRequest(BaseModel):
    course_id: str
    payment_method: str


class CheckClashRequest(BaseModel):
    course_id: str


class PaymentRequest(BaseModel):
    enrollment_id: str
    amount: float
    method: str
    card_number: Optional[str] = None
    card_holder: Optional[str] = None
    expiry_date: Optional[str] = None
    cvv: Optional[str] = None
    bank_name: Optional[str] = None
    account_number: Optional[str] = None
    mobile_number: Optional[str] = None
    pin: Optional[str] = None


class SingleAttendanceRecord(BaseModel):
    enrollment_id: str
    status: AttendanceStatus


class MarkAttendanceRequest(BaseModel):
    enrollment_id: str
    date: str
    status: AttendanceStatus


class BulkAttendanceRequest(BaseModel):
    offering_id: str
    date: str
    records: list[SingleAttendanceRecord]


class EditAttendanceRequest(BaseModel):
    attendance_id: str
    status: AttendanceStatus
