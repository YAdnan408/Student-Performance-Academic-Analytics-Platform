from fastapi import Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.service import AnalyticsService


def get_analytics_service(db: Session = Depends(get_db)) -> AnalyticsService:
    repository = AnalyticsRepository(db)
    return AnalyticsService(repository)
