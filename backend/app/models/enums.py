import enum

class UserRole(str, enum.Enum):
    student = "student"
    instructor = "instructor"
    admin = "admin"

class EnrollmentStatus(str, enum.Enum):
    active = "active"
    dropped = "dropped"
    completed = "completed"

class AttendanceStatus(str, enum.Enum):
    present = "present"
    absent = "absent"
    late = "late"

class AssessmentType(str, enum.Enum):
    quiz = "quiz"
    assignment = "assignment"
    midterm = "midterm"
    final = "final"
