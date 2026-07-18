import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class GradingPolicy(Base):
    """Per-offering rules for how a component's marks are aggregated."""
    __tablename__ = "grading_policies"
    __table_args__ = (
        UniqueConstraint("course_offering_id", "component_type", name="uq_offering_component"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"), nullable=False)
    component_type = Column(String(50), nullable=False)
    planned_count = Column(Integer, default=1)
    drop_lowest = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    course_offering = relationship("CourseOffering", back_populates="grading_policies")
