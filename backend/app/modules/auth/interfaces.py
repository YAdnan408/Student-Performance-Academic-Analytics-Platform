from abc import ABC, abstractmethod
from app.models.user import User
from app.modules.auth.schema import UserCreate

class IAuthRepository(ABC):
    @abstractmethod
    def get_by_email(self, email: str) -> User | None:
        pass

    @abstractmethod
    def create_user(self, user_in: UserCreate, hashed_password: str) -> User:
        pass

class IAuthService(ABC):
    @abstractmethod
    def authenticate_user(self, email: str, password: str) -> User:
        pass

    @abstractmethod
    def create_tokens(self, user: User) -> dict:
        pass

    @abstractmethod
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        pass

    @abstractmethod
    def get_password_hash(self, password: str) -> str:
        pass
