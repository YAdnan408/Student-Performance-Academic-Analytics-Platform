from pydantic import BaseModel
from typing import Optional, Any


class CourseCreateRequest(BaseModel):
    course_code: str
    title: str
    description: str
    cost: float = 0.0
    duration: str = "16 weeks"
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    marks_distribution: Optional[dict[str, Any]] = None
    class_schedule: Optional[dict[str, Any]] = None


class CourseUpdateRequest(BaseModel):
    course_code: Optional[str] = None
    title: Optional[str] = None
    description: Optional[str] = None
    cost: Optional[float] = None
    duration: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    marks_distribution: Optional[dict[str, Any]] = None
    class_schedule: Optional[dict[str, Any]] = None
    instructor_id: Optional[str] = None


class AssignInstructorRequest(BaseModel):
    course_id: str
    instructor_id: str
    semester_id: Optional[str] = None
