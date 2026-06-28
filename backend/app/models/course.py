import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Float, Date, DateTime
from sqlalchemy.dialects.postgresql import UUID, JSON
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Course(Base):
    __tablename__ = "courses"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_code = Column(String(20), unique=True, nullable=False)
    title = Column(String(255), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    credit_hours = Column(Integer)
    description = Column(String)
    cost = Column(Float, default=0.0)
    duration = Column(String(100))
    start_date = Column(Date)
    end_date = Column(Date)
    marks_distribution = Column(JSON)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    department = relationship("Department", back_populates="courses")
    offerings = relationship("CourseOffering", back_populates="course")
