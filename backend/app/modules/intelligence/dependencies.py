from fastapi import Depends
from app.modules.intelligence.service import IntelligenceService


def get_intelligence_service() -> IntelligenceService:
    return IntelligenceService()
