from __future__ import annotations

import json
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, WebSocket, WebSocketDisconnect
from jose import JWTError, jwt
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import SessionLocal, get_db
from app.models.user import User
from app.modules.auth.dependencies import RoleChecker
from app.modules.auth.repository import AuthRepository
from app.modules.chat.dependencies import get_chat_service
from app.modules.chat.exceptions import ChatException
from app.modules.chat.manager import chat_manager
from app.modules.chat.service import ChatService

router = APIRouter(prefix="/chat", tags=["Chat"])


class TextMessageIn(BaseModel):
    body: str = Field(..., min_length=1, max_length=5000)


def _user_from_token(db: Session, token: str) -> Optional[User]:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        email = payload.get("sub")
        if not email:
            return None
        user = AuthRepository(db).get_by_email(email)
        if not user or not user.is_active:
            return None
        return user
    except JWTError:
        return None


@router.get("/inbox")
def get_inbox(
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    return service.get_inbox(db, str(user.id))


@router.post("/offerings/{offering_id}/read")
def mark_channel_read(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    return service.mark_read(db, str(user.id), offering_id)


@router.get("/offerings/{offering_id}/members")
def get_members(
    offering_id: str,
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    return service.list_members(db, str(user.id), offering_id)


@router.get("/offerings/{offering_id}/messages")
def get_messages(
    offering_id: str,
    limit: int = Query(50, ge=1, le=100),
    before_id: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    return service.list_messages(db, str(user.id), offering_id, limit=limit, before_id=before_id)


@router.post("/offerings/{offering_id}/messages")
async def post_text_message(
    offering_id: str,
    payload: TextMessageIn,
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    message = await service.create_text_message(db, str(user.id), offering_id, payload.body)
    await chat_manager.broadcast(offering_id, {"type": "message", "message": message})
    return message


@router.post("/offerings/{offering_id}/attachments")
async def post_attachment(
    offering_id: str,
    file: UploadFile = File(...),
    caption: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    service: ChatService = Depends(get_chat_service),
    user: User = Depends(RoleChecker(["student", "instructor"])),
):
    content = await file.read()
    message = await service.create_attachment_message(
        db,
        str(user.id),
        offering_id,
        filename=file.filename or "file",
        content=content,
        caption=caption,
    )
    await chat_manager.broadcast(offering_id, {"type": "message", "message": message})
    return message


@router.websocket("/ws/{offering_id}")
async def chat_websocket(websocket: WebSocket, offering_id: str, token: Optional[str] = Query(None)):
    if not token:
        await websocket.close(code=4401)
        return

    db = SessionLocal()
    try:
        user = _user_from_token(db, token)
        if not user:
            await websocket.close(code=4401)
            return
        service = ChatService()
        try:
            service.resolve_access(db, str(user.id), offering_id)
        except ChatException:
            await websocket.close(code=4403)
            return

        await chat_manager.connect(offering_id, websocket)
        await websocket.send_text(json.dumps({"type": "connected", "offering_id": offering_id}))

        while True:
            raw = await websocket.receive_text()
            try:
                data = json.loads(raw)
            except json.JSONDecodeError:
                continue
            if data.get("type") != "chat":
                continue
            body = (data.get("body") or "").strip()
            if not body:
                continue
            try:
                message = await service.create_text_message(db, str(user.id), offering_id, body)
                await chat_manager.broadcast(offering_id, {"type": "message", "message": message})
            except ChatException as exc:
                await websocket.send_text(json.dumps({"type": "error", "detail": exc.message}))
    except WebSocketDisconnect:
        chat_manager.disconnect(offering_id, websocket)
    except Exception:
        chat_manager.disconnect(offering_id, websocket)
        try:
            await websocket.close()
        except Exception:
            pass
    finally:
        db.close()
