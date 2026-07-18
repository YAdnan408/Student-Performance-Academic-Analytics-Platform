from fastapi import Depends
from app.modules.reporting.service import ReportingService


def get_reporting_service() -> ReportingService:
    return ReportingService()
