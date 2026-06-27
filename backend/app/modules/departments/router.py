from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.models.department import Department
from app.models.program import Program
from pydantic import BaseModel
from uuid import UUID

router = APIRouter(prefix="/departments", tags=["Departments"])

class DepartmentResponse(BaseModel):
    id: UUID
    name: str
    code: str

    class Config:
        from_attributes = True

class ProgramResponse(BaseModel):
    id: UUID
    name: str
    department_id: UUID
    degree_level: str

    class Config:
        from_attributes = True

@router.get("", response_model=list[DepartmentResponse])
def list_departments(
    degree_level: str | None = Query(None, description="Filter departments by degree level"),
    db: Session = Depends(get_db)
):
    query = db.query(Department)
    if degree_level:
        levels = [l.strip() for l in degree_level.split(",")]
        query = query.join(Program).filter(Program.degree_level.in_(levels)).distinct()
    return query.all()

@router.get("/programs", response_model=list[ProgramResponse])
def list_programs(
    degree_level: str | None = Query(None, description="Filter programs by degree level"),
    department_id: str | None = Query(None, description="Filter programs by department ID"),
    db: Session = Depends(get_db)
):
    query = db.query(Program)
    if degree_level:
        levels = [l.strip() for l in degree_level.split(",")]
        query = query.filter(Program.degree_level.in_(levels))
    if department_id:
        query = query.filter(Program.department_id == department_id)
    return query.all()
