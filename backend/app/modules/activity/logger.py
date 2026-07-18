"""Lightweight activity feed logger for dashboard Recent Activity."""

from __future__ import annotations

from typing import Optional
from uuid import UUID

from sqlalchemy.orm import Session

from app.models.activity import Activity
from app.models.user import User


def _actor_info(db: Session, user_id: str) -> tuple[str, str]:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        return "Unknown", "unknown"
    role = user.role.value if hasattr(user.role, "value") else str(user.role)
    if role == "student" and user.student:
        name = f"{user.student.first_name} {user.student.last_name}".strip()
    elif role == "instructor" and user.instructor:
        name = f"{user.instructor.first_name} {user.instructor.last_name}".strip()
    else:
        name = user.email.split("@")[0]
    return name or user.email, role


def log_activity(
    db: Session,
    user_id: str,
    action_type: str,
    message: str,
    *,
    course_code: Optional[str] = None,
    course_title: Optional[str] = None,
    offering_id: Optional[str] = None,
    link: Optional[str] = None,
    commit: bool = True,
) -> None:
    """Record a personal activity for the acting user. Failures never break the main flow."""
    try:
        actor_name, role = _actor_info(db, user_id)
        offering_uuid = None
        if offering_id:
            offering_uuid = UUID(str(offering_id)) if not isinstance(offering_id, UUID) else offering_id

        activity = Activity(
            user_id=user_id,
            actor_name=actor_name,
            role=role,
            action_type=action_type,
            message=message,
            course_code=course_code,
            course_title=course_title,
            offering_id=offering_uuid,
            link=link,
        )
        db.add(activity)
        if commit:
            db.commit()
        else:
            db.flush()
    except Exception:
        try:
            db.rollback()
        except Exception:
            pass


def list_recent_activities(db: Session, user_id: str, limit: int = 15) -> list[dict]:
    rows = (
        db.query(Activity)
        .filter(Activity.user_id == user_id)
        .order_by(Activity.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "id": str(a.id),
            "actor_name": a.actor_name,
            "role": a.role,
            "action_type": a.action_type,
            "message": a.message,
            "course_code": a.course_code,
            "course_title": a.course_title,
            "offering_id": str(a.offering_id) if a.offering_id else None,
            "link": a.link,
            "created_at": a.created_at.isoformat() if a.created_at else None,
        }
        for a in rows
    ]
