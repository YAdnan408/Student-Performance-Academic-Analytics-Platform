import uuid
from sqlalchemy import Column, ForeignKey, Float, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class GPARecord(Base):
    __tablename__ = "gpa_records"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"))
    gpa = Column(Float)
    cgpa = Column(Float)
    total_credits = Column(Integer)
    calculated_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="gpa_records")
    semester = relationship("Semester", back_populates="gpa_records")
