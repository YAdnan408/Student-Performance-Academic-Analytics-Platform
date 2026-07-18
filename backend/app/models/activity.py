import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime, Text, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base


class Activity(Base):
    __tablename__ = "activities"
    __table_args__ = (
        Index("ix_activities_user_created", "user_id", "created_at"),
    )

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    actor_name = Column(String(255), nullable=False)
    role = Column(String(20), nullable=False)  # student | instructor
    action_type = Column(String(50), nullable=False)
    message = Column(Text, nullable=False)
    course_code = Column(String(50))
    course_title = Column(String(255))
    offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"), nullable=True)
    link = Column(String(500))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", back_populates="activities")
