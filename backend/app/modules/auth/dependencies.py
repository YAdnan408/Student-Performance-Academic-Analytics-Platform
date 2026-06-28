from fastapi import Depends
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.config import settings
from app.models.user import User
from app.modules.auth.exceptions import InvalidTokenException, UserDisabledException
from app.modules.auth.schema import TokenData
from app.modules.auth.repository import AuthRepository

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login", auto_error=False)

def get_current_user(token: str | None = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    if token is None:
        raise InvalidTokenException()
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email: str = payload.get("sub")
        role: str = payload.get("role")
        if email is None:
            raise InvalidTokenException()
        token_data = TokenData(email=email, role=role)
    except JWTError:
        raise InvalidTokenException()
    
    repository = AuthRepository(db)
    user = repository.get_by_email(token_data.email)
    if user is None:
        raise InvalidTokenException()
    if not user.is_active:
        raise UserDisabledException()
    return user

class RoleChecker:
    def __init__(self, allowed_roles: list):
        self.allowed_roles = allowed_roles

    def __call__(self, user: User = Depends(get_current_user)):
        if user.role not in self.allowed_roles:
            from app.core.exceptions import ForbiddenException
            raise ForbiddenException("You do not have permission to perform this action")
        return user
