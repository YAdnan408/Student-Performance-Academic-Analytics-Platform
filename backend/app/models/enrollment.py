import uuid
from sqlalchemy import Column, ForeignKey, Enum, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import EnrollmentStatus

class Enrollment(Base):
    __tablename__ = "enrollments"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    student_id = Column(UUID(as_uuid=True), ForeignKey("students.id"))
    course_offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"))
    enrolled_at = Column(DateTime(timezone=True), server_default=func.now())
    status = Column(Enum(EnrollmentStatus), default=EnrollmentStatus.active)

    student = relationship("Student", back_populates="enrollments")
    course_offering = relationship("CourseOffering", back_populates="enrollments")
    attendance_records = relationship("Attendance", back_populates="enrollment")
    payment = relationship("Payment", back_populates="enrollment", uselist=False)
