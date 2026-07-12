from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.modules.academic.service import AcademicService
from app.modules.academic.dependencies import get_academic_service
from app.modules.academic.schema import EnrollRequest, CheckClashRequest, MarkAttendanceRequest, BulkAttendanceRequest, EditAttendanceRequest

router = APIRouter(prefix="/academic", tags=["Academic"])


@router.get("/courses")
def list_courses(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.list_courses(db)


@router.get("/courses/{course_id}")
def get_course_detail(
    course_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.get_course_detail(db, course_id, str(user.id))


@router.post("/check-clash")
def check_schedule_clash(
    request: CheckClashRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.check_schedule_clash(db, str(user.id), request.course_id)


@router.post("/enroll")
def enroll_course(
    request: EnrollRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.enroll_student(db, str(user.id), request.course_id, request.payment_method)


@router.get("/my-courses")
def my_courses(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.get_my_courses(db, str(user.id))


@router.get("/instructor/my-courses")
def instructor_my_courses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return AcademicService.get_instructor_courses(db, str(user.id))


@router.post("/attendance/mark")
def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.mark_attendance(db, str(user.id), request.enrollment_id, request.date, request.status.value)


@router.post("/attendance/bulk")
def bulk_mark_attendance(
    request: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    records = [{"enrollment_id": r.enrollment_id, "status": r.status.value} for r in request.records]
    return service.bulk_mark_attendance(db, str(user.id), request.offering_id, request.date, records)


@router.put("/attendance/edit")
def edit_attendance(
    request: EditAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.edit_attendance(db, str(user.id), request.attendance_id, request.status.value)


@router.get("/attendance/course/{offering_id}")
def get_course_attendance(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_course_attendance(db, str(user.id), offering_id)


@router.get("/attendance/my")
def get_my_attendance(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_my_attendance(db, str(user.id))


@router.get("/attendance/course/{offering_id}/date/{attendance_date}")
def get_course_attendance_for_date(
    offering_id: str,
    attendance_date: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_course_attendance_for_date(db, str(user.id), offering_id, attendance_date)


@router.get("/attendance/course/{offering_id}/student")
def get_student_attendance_for_course(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_attendance_for_course(db, str(user.id), offering_id)
