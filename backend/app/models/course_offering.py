import uuid
from sqlalchemy import Column, String, ForeignKey, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base

class CourseOffering(Base):
    __tablename__ = "course_offerings"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_id = Column(UUID(as_uuid=True), ForeignKey("courses.id"))
    instructor_id = Column(UUID(as_uuid=True), ForeignKey("instructors.id"))
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course = relationship("Course", back_populates="offerings")
    instructor = relationship("Instructor", back_populates="course_offerings")
    semester = relationship("Semester", back_populates="offerings")
    enrollments = relationship("Enrollment", back_populates="course_offering")
    assessments = relationship("Assessment", back_populates="course_offering")
