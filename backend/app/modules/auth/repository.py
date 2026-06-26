from sqlalchemy.orm import Session
from app.models.user import User
from app.models.student import Student
from app.models.instructor import Instructor
from app.models.department import Department
from app.modules.auth.schema import UserCreate, RegisterRequest
from app.modules.auth.interfaces import IAuthRepository
from app.core.exceptions import AppException

class AuthRepository(IAuthRepository):
    def __init__(self, db: Session):
        self.db = db

    def get_by_email(self, email: str) -> User | None:
        return self.db.query(User).filter(User.email == email).first()

    def get_department_by_code(self, code: str) -> Department | None:
        return self.db.query(Department).filter(Department.code == code).first()

    def create_user(self, user_in: UserCreate, hashed_password: str) -> User:
        db_user = User(
            email=user_in.email,
            password_hash=hashed_password,
            role=user_in.role
        )
        self.db.add(db_user)
        self.db.commit()
        self.db.refresh(db_user)
        return db_user

    def create_student(self, user: User, data: RegisterRequest) -> User:
        department = None
        if data.department_code:
            department = self.get_department_by_code(data.department_code)
            if not department:
                raise AppException(f"Department with code '{data.department_code}' not found")

        student = Student(
            user_id=user.id,
            student_id=data.student_id,
            first_name=data.first_name,
            last_name=data.last_name,
            department_id=department.id if department else None,
            phone=data.phone,
            address=data.address,
            enrolled_semester=data.enrolled_semester,
            current_semester=data.current_semester,
        )
        self.db.add(student)
        self.db.commit()
        self.db.refresh(user)
        return user

    def create_instructor(self, user: User, data: RegisterRequest) -> User:
        department = None
        if data.department_code:
            department = self.get_department_by_code(data.department_code)
            if not department:
                raise AppException(f"Department with code '{data.department_code}' not found")

        instructor = Instructor(
            user_id=user.id,
            employee_id=data.employee_id,
            first_name=data.first_name,
            last_name=data.last_name,
            department_id=department.id if department else None,
            designation=data.designation,
            phone=data.phone,
            address=data.address,
        )
        self.db.add(instructor)
        self.db.commit()
        self.db.refresh(user)
        return user
