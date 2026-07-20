from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.modules.auth.dependencies import RoleChecker
from app.modules.intelligence.dependencies import get_intelligence_service
from app.modules.intelligence.service import IntelligenceService

router = APIRouter(prefix="/intelligence", tags=["Intelligence"])


@router.get("/student/insights")
def student_insights(
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_insights(db, str(user.id))


@router.post("/student/refresh")
def student_refresh(
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.refresh_student_all(db, str(user.id))


@router.post("/student/courses/{offering_id}/refresh")
def student_refresh_course(
    offering_id: str,
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.refresh_student_offering(db, str(user.id), offering_id)


@router.get("/instructor/courses/{offering_id}/risk")
def instructor_course_risk(
    offering_id: str,
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_instructor_offering_risk(db, str(user.id), offering_id)


@router.post("/instructor/courses/{offering_id}/refresh")
def instructor_refresh_course(
    offering_id: str,
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.refresh_instructor_offering(db, str(user.id), offering_id)


@router.post("/train")
def train_models_endpoint(
    db: Session = Depends(get_db),
    service: IntelligenceService = Depends(get_intelligence_service),
    user: User = Depends(RoleChecker(["instructor", "admin"])),
):
    """Train LogReg + RandomForest + XGBoost on completed labeled enrollments."""
    return service.train(db)
