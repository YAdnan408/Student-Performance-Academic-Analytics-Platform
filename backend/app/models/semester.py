import uuid
from sqlalchemy import Column, String, Date
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from ..core.database import Base

class Semester(Base):
    __tablename__ = "semesters"
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(50), nullable=False)
    start_date = Column(Date)
    end_date = Column(Date)

    offerings = relationship("CourseOffering", back_populates="semester")
    gpa_records = relationship("GPARecord", back_populates="semester")
    ml_predictions = relationship("MLPrediction", back_populates="semester")
