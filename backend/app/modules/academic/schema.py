from pydantic import BaseModel, Field
from typing import Optional
from app.models.enums import AttendanceStatus, AssessmentType, MaterialType


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


# ── Grades / Assessments ──────────────────────────────────────────

class GradingPolicyItem(BaseModel):
    component_type: str  # quiz, assignment, lab, midterm, final, attendance
    planned_count: int = 1
    drop_lowest: int = 0


class UpsertGradingPoliciesRequest(BaseModel):
    policies: list[GradingPolicyItem]


class CreateAssessmentRequest(BaseModel):
    title: str
    type: AssessmentType
    total_marks: int = Field(..., gt=0, description="Exam max marks (what assessment was out of)")
    due_date: Optional[str] = None
    sequence_number: Optional[int] = None
    form_url: Optional[str] = None
    description: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    is_published: bool = False


class UpdateAssessmentRequest(BaseModel):
    title: Optional[str] = None
    total_marks: Optional[int] = None
    due_date: Optional[str] = None
    sequence_number: Optional[int] = None
    form_url: Optional[str] = None
    description: Optional[str] = None
    window_start: Optional[str] = None
    window_end: Optional[str] = None
    is_published: Optional[bool] = None


class GradeEntry(BaseModel):
    student_id: str  # students.id UUID or student_id code — service accepts both
    marks_obtained: Optional[float] = None


class UpsertGradesRequest(BaseModel):
    grades: list[GradeEntry]


class MultiAssessmentGradeRow(BaseModel):
    student_id: str
    marks: dict[str, Optional[float]]  # assessment_id → marks


class UpsertMultiGradesRequest(BaseModel):
    rows: list[MultiAssessmentGradeRow]


class CreateMaterialRequest(BaseModel):
    title: str
    description: Optional[str] = None
    material_type: MaterialType
    external_url: Optional[str] = None
    sort_order: int = 0


class UpdateMaterialRequest(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    external_url: Optional[str] = None
    sort_order: Optional[int] = None
