import uuid
from sqlalchemy import Column, ForeignKey, Float, DateTime
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.sql import func
from ..core.database import Base

class DepartmentAnalytics(Base):
    __tablename__ = "department_analytics"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    department_id = Column(UUID(as_uuid=True), ForeignKey("departments.id"))
    semester_id = Column(UUID(as_uuid=True), ForeignKey("semesters.id"))
    avg_gpa = Column(Float)
    pass_rate = Column(Float)
    fail_rate = Column(Float)
    avg_attendance = Column(Float)
    computed_at = Column(DateTime(timezone=True), server_default=func.now())
