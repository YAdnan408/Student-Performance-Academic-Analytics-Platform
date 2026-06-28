from fastapi import APIRouter, Depends, UploadFile, File, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.modules.profile.schema import StudentProfileResponse, InstructorProfileResponse, StudentProfileUpdate, InstructorProfileUpdate
from app.modules.profile.repository import ProfileRepository
from app.modules.profile.service import ProfileService
from app.modules.profile.storage import storage_provider
from app.models.user import User

router = APIRouter(prefix="/profile", tags=["Profile"])


def get_profile_service(db: Session = Depends(get_db)) -> ProfileService:
    repository = ProfileRepository(db)
    return ProfileService(repository, storage_provider)


@router.get("/student", response_model=StudentProfileResponse)
def get_student_profile(
    current_user: User = Depends(RoleChecker(["student"])),
    service: ProfileService = Depends(get_profile_service),
):
    student = service.get_student_profile(current_user)
    student.email = current_user.email
    return student


@router.get("/instructor", response_model=InstructorProfileResponse)
def get_instructor_profile(
    current_user: User = Depends(RoleChecker(["instructor"])),
    service: ProfileService = Depends(get_profile_service),
):
    instructor = service.get_instructor_profile(current_user)
    instructor.email = current_user.email
    return instructor


@router.put("/student", response_model=StudentProfileResponse)
def update_student_profile(
    data: StudentProfileUpdate,
    current_user: User = Depends(RoleChecker(["student"])),
    service: ProfileService = Depends(get_profile_service),
):
    student = service.update_student_profile(current_user, data)
    student.email = current_user.email
    return student


@router.put("/instructor", response_model=InstructorProfileResponse)
def update_instructor_profile(
    data: InstructorProfileUpdate,
    current_user: User = Depends(RoleChecker(["instructor"])),
    service: ProfileService = Depends(get_profile_service),
):
    instructor = service.update_instructor_profile(current_user, data)
    instructor.email = current_user.email
    return instructor


@router.post("/photo", response_model=dict)
async def upload_profile_photo(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    service: ProfileService = Depends(get_profile_service),
):
    photo_url = await service.upload_profile_photo(current_user, file.file, file.filename or "photo.jpg")
    return {"photo_url": photo_url}
