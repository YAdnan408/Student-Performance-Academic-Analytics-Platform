import uuid
from sqlalchemy import Column, String, ForeignKey, Float, DateTime, Boolean
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class MLPrediction(Base):
    __tablename__ = "ml_predictions"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    course_offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"), nullable=True)
    risk_score = Column(Float)
    risk_level = Column(String(20))  # low, medium, high
    model_version = Column(String(50))
    features_snapshot = Column(JSONB)
    explanation = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="ml_predictions")
    course_offering = relationship("CourseOffering")
