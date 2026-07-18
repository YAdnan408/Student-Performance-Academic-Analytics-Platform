import uuid
from sqlalchemy import Column, String, ForeignKey, Integer, Enum, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.database import Base
from .enums import MaterialType


class CourseMaterial(Base):
    __tablename__ = "course_materials"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    course_offering_id = Column(UUID(as_uuid=True), ForeignKey("course_offerings.id"), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    material_type = Column(Enum(MaterialType), nullable=False)
    file_url = Column(String(500))
    external_url = Column(String(500))
    file_name = Column(String(255))
    sort_order = Column(Integer, default=0)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    course_offering = relationship("CourseOffering", back_populates="materials")
