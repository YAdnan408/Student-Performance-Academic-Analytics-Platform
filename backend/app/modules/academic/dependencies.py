from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.academic.repository import AcademicRepository
from app.modules.academic.service import AcademicService
from app.modules.academic.grades_service import GradesService


def get_academic_service(db: Session = Depends(get_db)) -> AcademicService:
    repository = AcademicRepository(db)
    return AcademicService(repository)


def get_grades_service() -> GradesService:
    return GradesService()
