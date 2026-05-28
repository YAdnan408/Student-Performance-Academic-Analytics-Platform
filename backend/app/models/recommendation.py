import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Recommendation(Base):
    __tablename__ = "recommendations"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    type = Column(String(50))
    message = Column(String)
    priority = Column(String(20)) # low, medium, high
    source = Column(String(20)) # rule_based, ml_based
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    student = relationship("Student", back_populates="recommendations")
