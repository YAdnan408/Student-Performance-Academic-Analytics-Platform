from passlib.context import CryptContext
from app.models.user import User
from app.modules.auth.interfaces import IAuthService, IAuthRepository
from app.modules.auth.exceptions import InvalidCredentialsException
from app.core.security import create_access_token, create_refresh_token

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class AuthService(IAuthService):
    def __init__(self, repository: IAuthRepository):
        self.repository = repository

    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        return pwd_context.verify(plain_password, hashed_password)

    def get_password_hash(self, password: str) -> str:
        return pwd_context.hash(password)

    def authenticate_user(self, email: str, password: str) -> User:
        user = self.repository.get_by_email(email)
        if not user:
            raise InvalidCredentialsException()
        if not self.verify_password(password, user.password_hash):
            raise InvalidCredentialsException()
        return user

    def create_tokens(self, user: User) -> dict:
        data = {"sub": user.email, "role": user.role}
        access_token = create_access_token(data)
        refresh_token = create_refresh_token(data)
        return {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "token_type": "bearer"
        }
