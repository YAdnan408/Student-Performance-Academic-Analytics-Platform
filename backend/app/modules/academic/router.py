from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.modules.academic.service import AcademicService
from app.modules.academic.dependencies import get_academic_service
from app.modules.academic.schema import EnrollRequest

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
    return service.get_course_detail(db, course_id)


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
