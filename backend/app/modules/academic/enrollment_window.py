"""Course enrollment window helpers (Asia/Dhaka)."""

from __future__ import annotations

from datetime import date, datetime, timedelta
from typing import Optional
from zoneinfo import ZoneInfo

BD_TZ = ZoneInfo("Asia/Dhaka")


def now_bd() -> datetime:
    return datetime.now(BD_TZ)


def ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=BD_TZ)
    return dt.astimezone(BD_TZ)


def course_start_midnight_bd(start: date) -> datetime:
    return datetime(start.year, start.month, start.day, 0, 0, 0, tzinfo=BD_TZ)


def default_closes_24h_before_start(start: date) -> datetime:
    """Policy for new courses: enrollment closes 24 hours before course start (BD)."""
    return course_start_midnight_bd(start) - timedelta(hours=24)


def fallback_closes_at_start(start: date) -> datetime:
    """Legacy / missing window: treat close as start_date 00:00 BD."""
    return course_start_midnight_bd(start)


def parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    text = value.strip()
    if text.endswith("Z"):
        text = text[:-1] + "+00:00"
    dt = datetime.fromisoformat(text)
    return ensure_aware(dt)


def resolve_enrollment_window(course) -> tuple[Optional[datetime], Optional[datetime]]:
    """
    Returns (opens_at, closes_at) in BD timezone.
    If closes is unset but start_date exists → close = start_date 00:00 BD.
    """
    opens = ensure_aware(course.enrollment_opens_at) if getattr(course, "enrollment_opens_at", None) else None
    closes = ensure_aware(course.enrollment_closes_at) if getattr(course, "enrollment_closes_at", None) else None
    if closes is None and getattr(course, "start_date", None):
        closes = fallback_closes_at_start(course.start_date)
    return opens, closes


def enrollment_status_payload(course) -> dict:
    """
    enrollment_status: open | upcoming | closed
    """
    from app.models.enums import CourseStatus

    opens, closes = resolve_enrollment_window(course)
    now = now_bd()

    if getattr(course, "status", None) != CourseStatus.active.value:
        status = "closed"
        open_flag = False
    elif closes is None:
        status = "closed"
        open_flag = False
    elif opens and now < opens:
        status = "upcoming"
        open_flag = False
    elif now > closes:
        status = "closed"
        open_flag = False
    else:
        status = "open"
        open_flag = True

    def _iso(dt: Optional[datetime]) -> Optional[str]:
        return dt.isoformat() if dt else None

    stored_opens = ensure_aware(course.enrollment_opens_at) if getattr(course, "enrollment_opens_at", None) else None

    return {
        "enrollment_open": open_flag,
        "enrollment_status": status,
        "enrollment_opens_at": _iso(stored_opens or opens),
        "enrollment_closes_at": _iso(closes),
    }


def validate_enrollment_window(
    *,
    opens: Optional[datetime],
    closes: Optional[datetime],
    start: Optional[date],
) -> None:
    from app.core.exceptions import ValidationException

    if opens and closes and opens >= closes:
        raise ValidationException("Enrollment opens must be before enrollment closes")

    if start and closes:
        # Soft policy: closes should be at least 24h before start midnight BD
        latest_allowed = default_closes_24h_before_start(start)
        # Allow exactly at latest_allowed or earlier; also allow legacy close==start for backfilled data
        start_midnight = course_start_midnight_bd(start)
        if closes > start_midnight:
            raise ValidationException("Enrollment must close on or before the course start date (Bangladesh time)")
        # Prefer 24h before; if closes is after (start-24h) but <= start, warn via still allowing
        # for admin flexibility on edge cases, but for NEW defaults we set 24h before.
        # Enforce: closes <= start_midnight (already). Recommend 24h in UI.
        _ = latest_allowed

    if opens and start:
        start_midnight = course_start_midnight_bd(start)
        if opens > start_midnight:
            raise ValidationException("Enrollment cannot open after the course start date")
