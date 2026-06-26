from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.department import Department
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(prefix="/departments", tags=["Departments"])

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str

    class Config:
        from_attributes = True

@router.get("", response_model=list[DepartmentResponse])
def list_departments(db: Session = Depends(get_db)):
    return db.query(Department).all()
