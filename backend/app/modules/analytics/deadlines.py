"""Upcoming assessment deadline helpers for dashboards."""

from __future__ import annotations

from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from app.models.assessment import Assessment
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.student import Student
from app.modules.academic.repository import AcademicRepository

BD_TZ = ZoneInfo("Asia/Dhaka")
TYPE_LABELS = {
    "quiz": "Quiz",
    "assignment": "Assignment",
    "lab": "Lab",
    "midterm": "Midterm",
    "final": "Final",
    "attendance": "Attendance",
}


def _deadline_sort_key(item: dict):
    raw = item.get("deadline_at")
    if not raw:
        return datetime.max.replace(tzinfo=timezone.utc)
    try:
        return datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return datetime.max.replace(tzinfo=timezone.utc)


def _serialize_deadline(assessment: Assessment, course_code: str, course_title: str, offering_id: str) -> dict | None:
    atype = assessment.type.value if hasattr(assessment.type, "value") else str(assessment.type)
    if atype == "attendance":
        return None

    deadline_at = None
    deadline_label = None
    if assessment.window_end:
        deadline_at = assessment.window_end
        deadline_label = "Exam window ends"
    elif assessment.due_date:
        deadline_at = datetime.combine(assessment.due_date, datetime.max.time()).replace(tzinfo=BD_TZ)
        deadline_label = "Due date"

    if not deadline_at:
        return None

    now = datetime.now(timezone.utc)
    aware = deadline_at if deadline_at.tzinfo else deadline_at.replace(tzinfo=BD_TZ)
    if aware < now:
        return None

    return {
        "assessment_id": str(assessment.id),
        "title": assessment.title,
        "type": atype,
        "type_label": TYPE_LABELS.get(atype, atype),
        "course_code": course_code,
        "course_title": course_title,
        "offering_id": offering_id,
        "due_date": str(assessment.due_date) if assessment.due_date else None,
        "window_start": assessment.window_start.isoformat() if assessment.window_start else None,
        "window_end": assessment.window_end.isoformat() if assessment.window_end else None,
        "deadline_at": aware.isoformat(),
        "deadline_label": deadline_label,
        "is_published": bool(assessment.is_published),
    }


def get_student_upcoming_deadlines(db: Session, user_id: str, limit: int = 10) -> list[dict]:
    student = db.query(Student).filter(Student.user_id == user_id).first()
    if not student:
        return []

    enrollments = (
        db.query(Enrollment)
        .options(
            joinedload(Enrollment.course_offering).joinedload(CourseOffering.course),
            joinedload(Enrollment.course_offering).joinedload(CourseOffering.assessments),
        )
        .filter(Enrollment.student_id == student.id, Enrollment.status.in_(["active", "completed"]))
        .all()
    )

    items: list[dict] = []
    for enr in enrollments:
        offering = enr.course_offering
        if not offering or not offering.course:
            continue
        for a in offering.assessments or []:
            if not a.is_published:
                continue
            row = _serialize_deadline(a, offering.course.course_code, offering.course.title, str(offering.id))
            if row:
                row["link"] = f"/student/my-courses/{offering.id}"
                items.append(row)

    items.sort(key=_deadline_sort_key)
    return items[:limit]


def get_instructor_upcoming_deadlines(db: Session, user_id: str, limit: int = 10) -> list[dict]:
    repo = AcademicRepository(db)
    instructor = repo.get_instructor_by_user_id(db, user_id)
    if not instructor:
        return []

    offerings = (
        db.query(CourseOffering)
        .options(joinedload(CourseOffering.course), joinedload(CourseOffering.assessments))
        .filter(CourseOffering.instructor_id == instructor.id)
        .all()
    )

    items: list[dict] = []
    for offering in offerings:
        if not offering.course:
            continue
        for a in offering.assessments or []:
            row = _serialize_deadline(a, offering.course.course_code, offering.course.title, str(offering.id))
            if row:
                row["link"] = f"/instructor/courses/{offering.id}"
                items.append(row)

    items.sort(key=_deadline_sort_key)
    return items[:limit]
