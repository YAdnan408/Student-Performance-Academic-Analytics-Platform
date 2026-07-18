from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.modules.analytics.service import AnalyticsService
from app.modules.analytics.dependencies import get_analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/student/overview")
def student_analytics_overview(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_analytics_overview(db, str(user.id))


@router.get("/student/attendance-heatmap")
def student_attendance_heatmap(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_attendance_heatmap(db, str(user.id))


@router.get("/instructor/overview")
def instructor_analytics_overview(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_instructor_analytics_overview(db, str(user.id))


@router.get("/student/dashboard")
def student_dashboard(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_dashboard(db, str(user.id))


@router.get("/student/gpa")
def student_gpa_analytics(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_gpa_analytics(db, str(user.id))


@router.get("/instructor/dashboard")
def instructor_dashboard(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_instructor_dashboard(db, str(user.id))


@router.get("/instructor/grades")
def instructor_grade_overview(
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_instructor_grade_overview(db, str(user.id))


@router.get("/instructor/course/{offering_id}/grades")
def instructor_course_grade_analytics(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_instructor_course_grade_analytics(db, str(user.id), offering_id)


@router.get("/instructor/course/{offering_id}/weekly-trend")
def instructor_course_weekly_trend(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AnalyticsService = Depends(get_analytics_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_course_weekly_trend(db, str(user.id), offering_id)
