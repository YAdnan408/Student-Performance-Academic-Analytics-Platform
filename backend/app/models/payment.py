import uuid
from sqlalchemy import Column, String, ForeignKey, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Payment(Base):
    __tablename__ = "payments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    enrollment_id = Column(UUID(as_uuid=True), ForeignKey("enrollments.id"))
    amount = Column(Float, nullable=False)
    method = Column(String(50))
    status = Column(String(20), default="completed")
    transaction_id = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    enrollment = relationship("Enrollment", back_populates="payment")
