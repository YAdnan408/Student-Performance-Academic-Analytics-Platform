from __future__ import annotations

import os
import re
from typing import Optional

from sqlalchemy.orm import Session

from app.models.notification import Notification
from app.modules.chat.exceptions import (
    ChatAccessDeniedException,
    ChatAttachmentException,
    ChatOfferingNotFoundException,
)
from app.modules.chat.repository import ChatRepository
from app.modules.profile.storage import storage_provider

ALLOWED_IMAGE_EXTS = {".png", ".jpg", ".jpeg", ".gif", ".webp"}
ALLOWED_FILE_EXTS = {".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx"}
ALLOWED_EXTS = ALLOWED_IMAGE_EXTS | ALLOWED_FILE_EXTS
MAX_ATTACHMENT_BYTES = 10 * 1024 * 1024  # 10 MB
MENTION_RE = re.compile(r"@([A-Za-z0-9_.'\- ]{1,80})")


class ChatService:
    def __init__(self) -> None:
        self.repo = ChatRepository()

    def resolve_access(self, db: Session, user_id: str, offering_id: str) -> dict:
        offering = self.repo.get_offering(db, offering_id)
        if not offering:
            raise ChatOfferingNotFoundException()

        instructor = self.repo.get_instructor_by_user_id(db, user_id)
        if instructor and offering.instructor_id and str(offering.instructor_id) == str(instructor.id):
            return {
                "role_badge": "Instructor",
                "display_name": f"{instructor.first_name} {instructor.last_name}".strip() or "Instructor",
                "photo": instructor.profile_photo,
                "offering": offering,
            }

        student = self.repo.get_student_by_user_id(db, user_id)
        if student and self.repo.get_active_enrollment(db, student.id, offering_id):
            return {
                "role_badge": "Student",
                "display_name": f"{student.first_name} {student.last_name}".strip() or "Student",
                "photo": student.profile_photo,
                "offering": offering,
            }

        raise ChatAccessDeniedException()

    def _sender_profile(self, db: Session, user_id: str, offering) -> dict:
        instructor = self.repo.get_instructor_by_user_id(db, user_id)
        if instructor and offering.instructor_id and str(offering.instructor_id) == str(instructor.id):
            return {
                "sender_id": str(user_id),
                "sender_name": f"{instructor.first_name} {instructor.last_name}".strip() or "Instructor",
                "sender_role": "Instructor",
                "sender_photo": instructor.profile_photo,
            }
        student = self.repo.get_student_by_user_id(db, user_id)
        if student:
            return {
                "sender_id": str(user_id),
                "sender_name": f"{student.first_name} {student.last_name}".strip() or "Student",
                "sender_role": "Student",
                "sender_photo": student.profile_photo,
            }
        return {
            "sender_id": str(user_id),
            "sender_name": "User",
            "sender_role": "Member",
            "sender_photo": None,
        }

    def serialize_message(self, db: Session, msg, offering=None) -> dict:
        if offering is None:
            offering = self.repo.get_offering(db, str(msg.course_offering_id))
        profile = self._sender_profile(db, str(msg.sender_user_id), offering)
        return {
            "id": str(msg.id),
            "offering_id": str(msg.course_offering_id),
            "body": msg.body,
            "message_type": msg.message_type,
            "attachment_url": msg.attachment_url,
            "attachment_name": msg.attachment_name,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
            **profile,
        }

    def _member_rows(self, db: Session, offering) -> list[dict]:
        members = []
        instructor = offering.instructor
        if instructor:
            user = self.repo.get_user(db, str(instructor.user_id)) if instructor.user_id else None
            members.append({
                "user_id": str(instructor.user_id) if instructor.user_id else None,
                "name": f"{instructor.first_name} {instructor.last_name}".strip() or "Instructor",
                "role": "Instructor",
                "photo": instructor.profile_photo,
                "code": instructor.employee_id,
                "email": user.email if user else None,
            })
        for enr in self.repo.list_enrollments(db, str(offering.id)):
            student = enr.student
            if not student:
                continue
            user = self.repo.get_user(db, str(student.user_id)) if student.user_id else None
            members.append({
                "user_id": str(student.user_id) if student.user_id else None,
                "name": f"{student.first_name} {student.last_name}".strip() or "Student",
                "role": "Student",
                "photo": student.profile_photo,
                "code": student.student_id,
                "email": user.email if user else None,
            })
        return members

    def list_members(self, db: Session, user_id: str, offering_id: str) -> dict:
        access = self.resolve_access(db, user_id, offering_id)
        offering = access["offering"]
        members = self._member_rows(db, offering)
        return {
            "offering_id": offering_id,
            "course_code": offering.course.course_code if offering.course else None,
            "title": offering.course.title if offering.course else None,
            "members": members,
            "total": len(members),
        }

    def list_messages(
        self,
        db: Session,
        user_id: str,
        offering_id: str,
        *,
        limit: int = 50,
        before_id: Optional[str] = None,
    ) -> dict:
        access = self.resolve_access(db, user_id, offering_id)
        offering = access["offering"]
        limit = max(1, min(int(limit or 50), 100))
        rows = self.repo.list_messages(db, offering_id, limit=limit, before_id=before_id)
        messages = [self.serialize_message(db, m, offering) for m in reversed(rows)]
        return {
            "offering_id": offering_id,
            "messages": messages,
            "has_more": len(rows) == limit,
        }

    def mark_read(self, db: Session, user_id: str, offering_id: str) -> dict:
        self.resolve_access(db, user_id, offering_id)
        row = self.repo.upsert_read_state(db, user_id, offering_id)
        return {
            "offering_id": offering_id,
            "last_read_at": row.last_read_at.isoformat() if row.last_read_at else None,
        }

    def _accessible_offerings(self, db: Session, user_id: str) -> list:
        instructor = self.repo.get_instructor_by_user_id(db, user_id)
        if instructor:
            return self.repo.list_instructor_offerings(db, instructor.id)
        student = self.repo.get_student_by_user_id(db, user_id)
        if student:
            return self.repo.list_student_offerings(db, student.id)
        return []

    def get_inbox(self, db: Session, user_id: str) -> dict:
        offerings = self._accessible_offerings(db, user_id)
        channels = []
        total_unread = 0
        for offering in offerings:
            oid = str(offering.id)
            read = self.repo.get_read_state(db, user_id, oid)
            last_read_at = read.last_read_at if read else None
            unread = self.repo.unread_count(db, user_id, oid, last_read_at)
            latest = self.repo.latest_message(db, oid)
            preview = None
            if latest:
                if latest.body:
                    preview = latest.body[:120]
                elif latest.attachment_name:
                    preview = f"📎 {latest.attachment_name}"
                else:
                    preview = "New attachment"
            total_unread += unread
            channels.append({
                "offering_id": oid,
                "course_code": offering.course.course_code if offering.course else None,
                "title": offering.course.title if offering.course else "Course",
                "unread_count": unread,
                "last_message_at": latest.created_at.isoformat() if latest and latest.created_at else None,
                "last_message_preview": preview,
            })
        channels.sort(
            key=lambda c: (c["unread_count"] > 0, c["last_message_at"] or ""),
            reverse=True,
        )
        return {
            "total_unread": total_unread,
            "channels": channels,
        }

    def _chat_link(self, user_id: str, offering_id: str, db: Session) -> str:
        instructor = self.repo.get_instructor_by_user_id(db, user_id)
        if instructor:
            return f"/instructor/courses/{offering_id}?tab=chat"
        return f"/student/my-courses/{offering_id}?tab=chat"

    def _notify_mentions(
        self,
        db: Session,
        *,
        sender_user_id: str,
        offering,
        message_body: Optional[str],
        serialized: dict,
    ) -> None:
        if not message_body:
            return
        members = self._member_rows(db, offering)
        by_name = {m["name"].lower(): m for m in members if m.get("user_id")}
        targets: set[str] = set()
        lower = message_body.lower()
        if "@everyone" in lower:
            for m in members:
                uid = m.get("user_id")
                if uid and uid != sender_user_id:
                    targets.add(uid)
        for match in MENTION_RE.finditer(message_body):
            token = match.group(1).strip().lower()
            if token == "everyone":
                continue
            matched = None
            for name, member in by_name.items():
                if name == token or name.startswith(token):
                    matched = member
                    if name == token:
                        break
            if matched and matched.get("user_id") and matched["user_id"] != sender_user_id:
                targets.add(matched["user_id"])

        if not targets:
            return

        code = offering.course.course_code if offering.course else "Course"
        title = offering.course.title if offering.course else code
        sender_name = serialized.get("sender_name") or "Someone"
        preview = (message_body or serialized.get("attachment_name") or "New message")[:140]
        notif_title = f"Mentioned in {code}"

        for uid in targets:
            link = self._chat_link(uid, str(offering.id), db)
            db.add(Notification(
                user_id=uid,
                title=notif_title,
                message=f"{sender_name} in {code} — {title}: {preview}",
                link=link,
                is_read=False,
            ))
        db.commit()

    async def create_text_message(self, db: Session, user_id: str, offering_id: str, body: str) -> dict:
        access = self.resolve_access(db, user_id, offering_id)
        text = (body or "").strip()
        if not text:
            raise ChatAttachmentException("Message text cannot be empty")
        if len(text) > 5000:
            raise ChatAttachmentException("Message text is too long (max 5000 characters)")
        msg = self.repo.create_message(
            db,
            offering_id=offering_id,
            sender_user_id=user_id,
            body=text,
            message_type="text",
        )
        serialized = self.serialize_message(db, msg, access["offering"])
        self._notify_mentions(db, sender_user_id=user_id, offering=access["offering"], message_body=text, serialized=serialized)
        # Auto-mark sender as read
        self.repo.upsert_read_state(db, user_id, offering_id)
        return serialized

    async def create_attachment_message(
        self,
        db: Session,
        user_id: str,
        offering_id: str,
        *,
        filename: str,
        content: bytes,
        caption: Optional[str] = None,
    ) -> dict:
        access = self.resolve_access(db, user_id, offering_id)
        if not content:
            raise ChatAttachmentException("Empty file")
        if len(content) > MAX_ATTACHMENT_BYTES:
            raise ChatAttachmentException("File too large (max 10 MB)")

        ext = os.path.splitext(filename or "")[1].lower()
        if ext not in ALLOWED_EXTS:
            raise ChatAttachmentException(
                "Unsupported file type. Allowed: images (png, jpg, jpeg, gif, webp) "
                "and documents (pdf, doc, docx, xls, xlsx, ppt, pptx)"
            )

        import io
        path = await storage_provider.upload(io.BytesIO(content), filename)
        url = storage_provider.get_url(path)
        message_type = "image" if ext in ALLOWED_IMAGE_EXTS else "file"
        caption_text = (caption or "").strip() or None
        if caption_text and len(caption_text) > 2000:
            raise ChatAttachmentException("Caption is too long")

        msg = self.repo.create_message(
            db,
            offering_id=offering_id,
            sender_user_id=user_id,
            body=caption_text,
            message_type=message_type,
            attachment_url=url,
            attachment_name=filename,
        )
        serialized = self.serialize_message(db, msg, access["offering"])
        self._notify_mentions(
            db,
            sender_user_id=user_id,
            offering=access["offering"],
            message_body=caption_text or filename,
            serialized=serialized,
        )
        self.repo.upsert_read_state(db, user_id, offering_id)
        return serialized
