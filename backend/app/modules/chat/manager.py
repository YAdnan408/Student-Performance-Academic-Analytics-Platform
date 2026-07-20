"""In-memory WebSocket room manager keyed by course offering id."""

from __future__ import annotations

import json
from collections import defaultdict
from typing import Any

from fastapi import WebSocket


class ChatConnectionManager:
    def __init__(self) -> None:
        self._rooms: dict[str, set[WebSocket]] = defaultdict(set)

    async def connect(self, offering_id: str, websocket: WebSocket) -> None:
        await websocket.accept()
        self._rooms[str(offering_id)].add(websocket)

    def disconnect(self, offering_id: str, websocket: WebSocket) -> None:
        room = self._rooms.get(str(offering_id))
        if not room:
            return
        room.discard(websocket)
        if not room:
            self._rooms.pop(str(offering_id), None)

    async def broadcast(self, offering_id: str, payload: dict[str, Any]) -> None:
        room = list(self._rooms.get(str(offering_id), set()))
        if not room:
            return
        data = json.dumps(payload, default=str)
        dead: list[WebSocket] = []
        for ws in room:
            try:
                await ws.send_text(data)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(offering_id, ws)


chat_manager = ChatConnectionManager()
