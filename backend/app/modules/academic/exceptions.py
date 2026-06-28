from app.core.exceptions import AppException


class CourseNotFoundException(AppException):
    def __init__(self, message: str = "Course not found"):
        super().__init__(message, status_code=404)


class StudentProfileNotFoundException(AppException):
    def __init__(self, message: str = "Student profile not found. Please complete your profile first."):
        super().__init__(message, status_code=404)


class AlreadyEnrolledException(AppException):
    def __init__(self, message: str = "You are already enrolled in this course"):
        super().__init__(message, status_code=409)
