from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.profile.repository import ProfileRepository
from app.modules.profile.service import ProfileService
from app.modules.profile.storage import storage_provider


def get_profile_service(db: Session = Depends(get_db)) -> ProfileService:
    repository = ProfileRepository(db)
    return ProfileService(repository, storage_provider)
