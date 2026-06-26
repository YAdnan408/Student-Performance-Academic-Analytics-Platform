from fastapi import FastAPI
from app.core.error_handlers import add_exception_handlers
from app.modules.auth.router import router as auth_router
from app.modules.departments.router import router as departments_router

app = FastAPI(title="Student Academics API")

# Add global exception handlers
add_exception_handlers(app)

# Register routers
app.include_router(auth_router)
app.include_router(departments_router)

@app.get("/")
async def root():
    return {"message": "Welcome to Student Performance & Academic Analytics API"}

@app.on_event("startup")
def seed_departments():
    from app.core.database import SessionLocal
    from app.models.department import Department
    db = SessionLocal()
    try:
        if db.query(Department).count() == 0:
            departments = [
                Department(name="Computer Science", code="CS"),
                Department(name="Electrical Engineering", code="EE"),
                Department(name="Mechanical Engineering", code="ME"),
                Department(name="Civil Engineering", code="CE"),
                Department(name="Business Administration", code="BA"),
                Department(name="Mathematics", code="MATH"),
                Department(name="Physics", code="PHY"),
                Department(name="Chemistry", code="CHEM"),
            ]
            db.add_all(departments)
            db.commit()
    finally:
        db.close()
