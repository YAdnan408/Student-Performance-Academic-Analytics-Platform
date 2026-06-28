from pydantic import BaseModel
from typing import Optional


class EnrollRequest(BaseModel):
    course_id: str
    payment_method: str


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
