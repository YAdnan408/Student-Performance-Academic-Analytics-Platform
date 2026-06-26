from app.core.exceptions import AppException

class AuthException(AppException):
    def __init__(self, message: str, status_code: int = 401):
        super().__init__(message, status_code)

class InvalidCredentialsException(AuthException):
    def __init__(self):
        super().__init__("Invalid email or password")

class TokenExpiredException(AuthException):
    def __init__(self):
        super().__init__("Token has expired")

class InvalidTokenException(AuthException):
    def __init__(self):
        super().__init__("Could not validate credentials")

class UserDisabledException(AuthException):
    def __init__(self):
        super().__init__("User account is disabled")

class EmailAlreadyExistsException(AuthException):
    def __init__(self):
        super().__init__("Email already registered", status_code=400)
