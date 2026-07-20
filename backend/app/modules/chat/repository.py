from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
from uuid import UUID

from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.models.chat_channel_read import ChatChannelRead
from app.models.chat_message import ChatMessage
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.enums import EnrollmentStatus
from app.models.instructor import Instructor
from app.models.student import Student
from app.models.user import User


class ChatRepository:
    def get_offering(self, db: Session, offering_id: str) -> Optional[CourseOffering]:
        return (
            db.query(CourseOffering)
            .options(
                joinedload(CourseOffering.course),
                joinedload(CourseOffering.instructor),
            )
            .filter(CourseOffering.id == offering_id)
            .first()
        )

    def get_instructor_by_user_id(self, db: Session, user_id: str) -> Optional[Instructor]:
        return db.query(Instructor).filter(Instructor.user_id == user_id).first()

    def get_student_by_user_id(self, db: Session, user_id: str) -> Optional[Student]:
        return db.query(Student).filter(Student.user_id == user_id).first()

    def get_user(self, db: Session, user_id: str) -> Optional[User]:
        return db.query(User).filter(User.id == user_id).first()

    def get_active_enrollment(self, db: Session, student_id, offering_id: str) -> Optional[Enrollment]:
        return (
            db.query(Enrollment)
            .filter(
                Enrollment.student_id == student_id,
                Enrollment.course_offering_id == offering_id,
                Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed]),
            )
            .first()
        )

    def list_enrollments(self, db: Session, offering_id: str) -> list[Enrollment]:
        return (
            db.query(Enrollment)
            .options(joinedload(Enrollment.student))
            .filter(
                Enrollment.course_offering_id == offering_id,
                Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed]),
            )
            .all()
        )

    def list_instructor_offerings(self, db: Session, instructor_id) -> list[CourseOffering]:
        return (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.course))
            .filter(CourseOffering.instructor_id == instructor_id)
            .all()
        )

    def list_student_offerings(self, db: Session, student_id) -> list[CourseOffering]:
        rows = (
            db.query(CourseOffering)
            .join(Enrollment, Enrollment.course_offering_id == CourseOffering.id)
            .options(joinedload(CourseOffering.course))
            .filter(
                Enrollment.student_id == student_id,
                Enrollment.status.in_([EnrollmentStatus.active, EnrollmentStatus.completed]),
            )
            .all()
        )
        return rows

    def list_messages(
        self,
        db: Session,
        offering_id: str,
        *,
        limit: int = 50,
        before_id: Optional[str] = None,
    ) -> list[ChatMessage]:
        q = db.query(ChatMessage).filter(ChatMessage.course_offering_id == offering_id)
        if before_id:
            pivot = db.query(ChatMessage).filter(ChatMessage.id == before_id).first()
            if pivot and pivot.created_at:
                q = q.filter(
                    (ChatMessage.created_at < pivot.created_at)
                    | ((ChatMessage.created_at == pivot.created_at) & (ChatMessage.id < pivot.id))
                )
        return q.order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc()).limit(limit).all()

    def latest_message(self, db: Session, offering_id: str) -> Optional[ChatMessage]:
        return (
            db.query(ChatMessage)
            .filter(ChatMessage.course_offering_id == offering_id)
            .order_by(ChatMessage.created_at.desc(), ChatMessage.id.desc())
            .first()
        )

    def unread_count(self, db: Session, user_id: str, offering_id: str, last_read_at: Optional[datetime]) -> int:
        q = db.query(func.count(ChatMessage.id)).filter(
            ChatMessage.course_offering_id == offering_id,
            ChatMessage.sender_user_id != user_id,
        )
        if last_read_at is not None:
            q = q.filter(ChatMessage.created_at > last_read_at)
        return int(q.scalar() or 0)

    def get_read_state(self, db: Session, user_id: str, offering_id: str) -> Optional[ChatChannelRead]:
        return (
            db.query(ChatChannelRead)
            .filter(
                ChatChannelRead.user_id == user_id,
                ChatChannelRead.course_offering_id == offering_id,
            )
            .first()
        )

    def upsert_read_state(self, db: Session, user_id: str, offering_id: str) -> ChatChannelRead:
        row = self.get_read_state(db, user_id, offering_id)
        now = datetime.now(timezone.utc)
        if row:
            row.last_read_at = now
        else:
            row = ChatChannelRead(
                user_id=UUID(str(user_id)),
                course_offering_id=UUID(str(offering_id)),
                last_read_at=now,
            )
            db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def create_message(
        self,
        db: Session,
        *,
        offering_id: str,
        sender_user_id: str,
        body: Optional[str],
        message_type: str,
        attachment_url: Optional[str] = None,
        attachment_name: Optional[str] = None,
    ) -> ChatMessage:
        msg = ChatMessage(
            course_offering_id=UUID(str(offering_id)),
            sender_user_id=UUID(str(sender_user_id)),
            body=(body or "").strip() or None,
            message_type=message_type,
            attachment_url=attachment_url,
            attachment_name=attachment_name,
        )
        db.add(msg)
        db.commit()
        db.refresh(msg)
        return msg
