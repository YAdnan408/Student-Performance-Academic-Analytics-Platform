from app.core.exceptions import AppException


class InstructorNotFoundException(AppException):
    def __init__(self, message: str = "Instructor not found"):
        super().__init__(message, status_code=404)


class CourseNotFoundException(AppException):
    def __init__(self, message: str = "Course not found"):
        super().__init__(message, status_code=404)
