from app.core.exceptions import AppException


class AnalyticsException(AppException):
    def __init__(self, message: str = "Analytics error", status_code: int = 400):
        super().__init__(message, status_code)
