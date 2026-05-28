import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..core.database import Base

class Report(Base):
    __tablename__ = "reports"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"), nullable=True)
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("instructors.id"), nullable=True)
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"))
    report_type = Column(String(50)) # student, class, department
    file_url = Column(String)
    generated_at = Column(DateTime(timezone=True), server_default=func.now())
