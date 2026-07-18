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


class ScheduleClashException(AppException):
    def __init__(self, message: str = "Schedule clash detected with an existing course"):
        super().__init__(message, status_code=409)


class InstructorNotAssignedException(AppException):
    def __init__(self, message: str = "You are not assigned to this course"):
        super().__init__(message, status_code=403)


class EnrollmentNotFoundException(AppException):
    def __init__(self, message: str = "Enrollment not found"):
        super().__init__(message, status_code=404)


class AttendanceAlreadyMarkedException(AppException):
    def __init__(self, message: str = "Attendance already marked for this date"):
        super().__init__(message, status_code=409)


class AttendanceNotFoundException(AppException):
    def __init__(self, message: str = "Attendance record not found"):
        super().__init__(message, status_code=404)


class InstructorProfileNotFoundException(AppException):
    def __init__(self, message: str = "Instructor profile not found"):
        super().__init__(message, status_code=404)


class AssessmentNotFoundException(AppException):
    def __init__(self, message: str = "Assessment not found"):
        super().__init__(message, status_code=404)


class AssessmentValidationException(AppException):
    def __init__(self, message: str = "Invalid assessment configuration"):
        super().__init__(message, status_code=400)


class GradeImportException(AppException):
    def __init__(self, message: str = "Grade import failed"):
        super().__init__(message, status_code=400)


class MaterialNotFoundException(AppException):
    def __init__(self, message: str = "Course material not found"):
        super().__init__(message, status_code=404)


class UnauthorizedAccessException(AppException):
    def __init__(self, message: str = "You do not have access to this resource"):
        super().__init__(message, status_code=403)
