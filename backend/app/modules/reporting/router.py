from fastapi import APIRouter, Depends
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.models.user import User
from app.modules.auth.dependencies import RoleChecker
from app.modules.reporting.dependencies import get_reporting_service
from app.modules.reporting.service import ReportingService

router = APIRouter(prefix="/reports", tags=["Reports"])


def _pdf_response(content: bytes, filename: str) -> Response:
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'inline; filename="{filename}"'},
    )


@router.get("/student/courses/{offering_id}/performance")
def student_course_performance_report(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ReportingService = Depends(get_reporting_service),
    user: User = Depends(RoleChecker(["student"])),
):
    pdf = service.generate_student_course_performance(db, str(user.id), offering_id)
    return _pdf_response(pdf, f"course-performance-{offering_id}.pdf")


@router.get("/student/courses/{offering_id}/attendance")
def student_course_attendance_report(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ReportingService = Depends(get_reporting_service),
    user: User = Depends(RoleChecker(["student"])),
):
    pdf = service.generate_student_course_attendance(db, str(user.id), offering_id)
    return _pdf_response(pdf, f"course-attendance-{offering_id}.pdf")


@router.get("/student/performance-summary")
def student_performance_summary_report(
    db: Session = Depends(get_db),
    service: ReportingService = Depends(get_reporting_service),
    user: User = Depends(RoleChecker(["student"])),
):
    pdf = service.generate_student_performance_summary(db, str(user.id))
    return _pdf_response(pdf, "academic-performance-summary.pdf")


@router.get("/instructor/courses/{offering_id}/grades")
def instructor_class_grades_report(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ReportingService = Depends(get_reporting_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    pdf = service.generate_instructor_class_grades(db, str(user.id), offering_id)
    return _pdf_response(pdf, f"class-grades-{offering_id}.pdf")


@router.get("/instructor/courses/{offering_id}/attendance")
def instructor_class_attendance_report(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ReportingService = Depends(get_reporting_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    pdf = service.generate_instructor_class_attendance(db, str(user.id), offering_id)
    return _pdf_response(pdf, f"class-attendance-{offering_id}.pdf")
