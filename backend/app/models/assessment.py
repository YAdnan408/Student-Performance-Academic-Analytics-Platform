import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Float, Enum, Date, DateTime, Boolean, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import AssessmentType


class Assessment(Base):
    __tablename__ = "assessments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    title = Column(String(255), nullable=False)
    type = Column(Enum(AssessmentType), nullable=False)
    total_marks = Column(Integer)  # exam max marks (what the assessment was taken out of)
    weightage = Column(Float)
    due_date = Column(Date)
    sequence_number = Column(Integer, default=1)
    form_url = Column(String(500))
    file_url = Column(String(500))
    window_start = Column(DateTime(timezone=True))
    window_end = Column(DateTime(timezone=True))
    is_published = Column(Boolean, default=False)
    description = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course_offering = relationship("CourseOffering", back_populates="assessments")
    grades = relationship("Grade", back_populates="assessment", cascade="all, delete-orphan")
