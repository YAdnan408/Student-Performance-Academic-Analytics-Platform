import os
import uuid
import aiofiles
from typing import BinaryIO
from app.core.config import settings
from app.modules.profile.interfaces import IStorageProvider


class LocalStorageProvider(IStorageProvider):
    def __init__(self, base_path: str = None):
        self.base_path = base_path or os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "uploads")

    async def upload(self, file: BinaryIO, filename: str) -> str:
        os.makedirs(self.base_path, exist_ok=True)
        ext = os.path.splitext(filename)[1] or ".jpg"
        unique_name = f"{uuid.uuid4().hex}{ext}"
        file_path = os.path.join(self.base_path, unique_name)

        async with aiofiles.open(file_path, "wb") as f:
            content = file.read()
            await f.write(content)

        return unique_name

    async def delete(self, path: str) -> None:
        file_path = os.path.join(self.base_path, path)
        if os.path.exists(file_path):
            os.remove(file_path)

    def get_url(self, path: str) -> str:
        return f"/uploads/{path}"


storage_provider: IStorageProvider = LocalStorageProvider()
