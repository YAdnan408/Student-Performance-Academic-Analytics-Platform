import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class Student(Base):
    __tablename__ = "students"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    student_id = Column(String(50), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    batch_year = Column(Integer)
    enrolled_semester = Column(String(20))
    current_semester = Column(String(20))
    phone = Column(String(20))
    address = Column(String)
    profile_photo = Column(String)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    user = relationship("User", back_populates="student")
    department = relationship("Department", back_populates="students")
    enrollments = relationship("Enrollment", back_populates="student")
    grades = relationship("Grade", back_populates="student")
    gpa_records = relationship("GPARecord", back_populates="student")
    ml_predictions = relationship("MLPrediction", back_populates="student")
    recommendations = relationship("Recommendation", back_populates="student")
