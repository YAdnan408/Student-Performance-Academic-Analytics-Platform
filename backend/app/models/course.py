import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Float, Date, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import CourseStatus

class Course(Base):
    __tablename__ = "courses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String(20), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(String)
    cost = Column(Float, default=0.0)
    duration = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    marks_distribution = Column(JSON)
    class_schedule = Column(JSON)
    status = Column(String(20), default=CourseStatus.active.value)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    offerings = relationship("CourseOffering", back_populates="course")
