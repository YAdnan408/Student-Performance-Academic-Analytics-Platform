from fastapi import APIRouter, Depends, status
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.modules.auth.schema import Token, UserCreate, UserResponse, LoginRequest, RegisterRequest, RefreshRequest
from app.modules.auth.repository import AuthRepository
from app.modules.auth.service import AuthService
from app.modules.auth.exceptions import EmailAlreadyExistsException, InvalidTokenException
from app.modules.auth.dependencies import get_current_user
from app.models.user import User
from app.models.enums import UserRole
from app.core.exceptions import AppException

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    repository = AuthRepository(db)
    service = AuthService(repository)

    if repository.get_by_email(data.email):
        raise EmailAlreadyExistsException()

    if data.role == UserRole.student and not data.student_id:
        raise AppException("Student ID is required for student registration")
    if data.role == UserRole.instructor and not data.employee_id:
        raise AppException("Employee ID is required for instructor registration")

    hashed_password = service.get_password_hash(data.password)
    user_in = UserCreate(email=data.email, password=data.password, role=data.role)
    user = repository.create_user(user_in, hashed_password)

    if data.role == UserRole.student:
        user = repository.create_student(user, data)
    elif data.role == UserRole.instructor:
        user = repository.create_instructor(user, data)

    return user

@router.post("/login", response_model=Token)
def login(login_data: LoginRequest, db: Session = Depends(get_db)):
    repository = AuthRepository(db)
    service = AuthService(repository)

    user = service.authenticate_user(login_data.email, login_data.password)
    return service.create_tokens(user)

@router.post("/refresh", response_model=Token)
def refresh(data: RefreshRequest, db: Session = Depends(get_db)):
    try:
        payload = jwt.decode(data.refresh_token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        if payload.get("type") != "refresh":
            raise InvalidTokenException()
        email = payload.get("sub")
        if email is None:
            raise InvalidTokenException()
    except JWTError:
        raise InvalidTokenException()

    repository = AuthRepository(db)
    user = repository.get_by_email(email)
    if user is None or not user.is_active:
        raise InvalidTokenException()

    service = AuthService(repository)
    return service.create_tokens(user)

@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user
