from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.error_handlers import add_exception_handlers
from app.modules.auth.router import router as auth_router
from app.modules.departments.router import router as departments_router
from app.modules.profile.router import router as profile_router
import os

app = FastAPI(title="Student Academics API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add global exception handlers
add_exception_handlers(app)

# Register routers
app.include_router(auth_router)
app.include_router(departments_router)
app.include_router(profile_router)

# Mount uploads directory for static file serving
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
async def root():
    return {"message": "Welcome to Student Performance & Academic Analytics API"}

@app.on_event("startup")
def seed_departments_and_programs():
    from app.core.database import SessionLocal, engine
    from app.models.department import Department
    from app.models.program import Program
    from sqlalchemy import inspect
    inspector = inspect(engine)
    if not inspector.has_table("programs"):
        return
    db = SessionLocal()
    try:
        if db.query(Program).count() > 0:
            return

        db.query(Program).delete()
        db.query(Department).delete()
        db.commit()

        ug_depts = {
            "SDCS": Department(name="School of Data & Computational Sciences", code="SDCS"),
            "SAD": Department(name="School of Architecture and Design", code="SAD"),
            "BBS": Department(name="BRAC Business School", code="BBS"),
            "SE": Department(name="School of Engineering", code="SE"),
            "SHSS": Department(name="School of Humanities and Social Sciences", code="SHSS"),
            "SLS": Department(name="School of Life Sciences", code="SLS"),
            "SL": Department(name="School of Law", code="SL"),
        }
        pg_depts = {
            "BBS_PG": Department(name="BRAC Business School (BBS)", code="BBS_PG"),
            "SDS_CSE": Department(name="School of Data and Sciences (SDS) - Computer Science and Engineering", code="SDS_CSE"),
            "SDS_MNS": Department(name="School of Data and Sciences (SDS) - Mathematics and Natural Sciences", code="SDS_MNS"),
            "SE_EEE": Department(name="School of Engineering - Electrical and Electronic Engineering", code="SE_EEE"),
            "SHSS_ESS": Department(name="School of Humanities and Social Sciences - Economics and Social Sciences", code="SHSS_ESS"),
            "SHSS_EH": Department(name="School of Humanities and Social Sciences - English and Humanities", code="SHSS_EH"),
            "SGE": Department(name="School of General Education & Institutes", code="SGE"),
            "BIGD": Department(name="BRAC Institute of Governance and Development", code="BIGD"),
        }

        all_depts = {**ug_depts, **pg_depts}
        db.add_all(list(all_depts.values()))
        db.flush()

        ug_programs = [
            Program(name="BSc in Computer Science", department_id=ug_depts["SDCS"].id, degree_level="undergraduate"),
            Program(name="BSc in Computer Science and Engineering", department_id=ug_depts["SDCS"].id, degree_level="undergraduate"),
            Program(name="Bachelor of Architecture", department_id=ug_depts["SAD"].id, degree_level="undergraduate"),
            Program(name="BBA", department_id=ug_depts["BBS"].id, degree_level="undergraduate"),
            Program(name="BSc in Electrical and Electronic Engineering", department_id=ug_depts["SE"].id, degree_level="undergraduate"),
            Program(name="BA in English", department_id=ug_depts["SHSS"].id, degree_level="undergraduate"),
            Program(name="BS in Economics", department_id=ug_depts["SHSS"].id, degree_level="undergraduate"),
            Program(name="BS in Anthropology", department_id=ug_depts["SHSS"].id, degree_level="undergraduate"),
            Program(name="BSc in Biotechnology", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="Microbiology", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="Mathematics", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="Physics", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="Applied Physics and Electronics", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="B.Pharm (Honors)", department_id=ug_depts["SLS"].id, degree_level="undergraduate"),
            Program(name="LLB (Honors)", department_id=ug_depts["SL"].id, degree_level="undergraduate"),
        ]

        pg_programs = [
            Program(name="Master of Business Administration (MBA)", department_id=pg_depts["BBS_PG"].id, degree_level="postgraduate"),
            Program(name="Executive MBA (EMBA)", department_id=pg_depts["BBS_PG"].id, degree_level="postgraduate"),
            Program(name="M.Sc./M.Engg. in Computer Science and Engineering", department_id=pg_depts["SDS_CSE"].id, degree_level="postgraduate"),
            Program(name="Master of Science in Biotechnology", department_id=pg_depts["SDS_MNS"].id, degree_level="postgraduate"),
            Program(name="M.Sc./M.Engg. in Electrical and Electronic Engineering", department_id=pg_depts["SE_EEE"].id, degree_level="postgraduate"),
            Program(name="Master of Science in Applied Economics (MSAE)", department_id=pg_depts["SHSS_ESS"].id, degree_level="postgraduate"),
            Program(name="Master of Arts in English (MA in English)", department_id=pg_depts["SHSS_EH"].id, degree_level="postgraduate"),
            Program(name="Master of Public Health (MPH)", department_id=pg_depts["SGE"].id, degree_level="postgraduate"),
            Program(name="Master of Education (M.Ed)", department_id=pg_depts["SGE"].id, degree_level="postgraduate"),
            Program(name="Master of Arts in TESOL", department_id=pg_depts["SGE"].id, degree_level="postgraduate"),
            Program(name="Master of Science in Early Childhood Development (MECD)", department_id=pg_depts["SGE"].id, degree_level="postgraduate"),
            Program(name="Postgraduate Diplomas", department_id=pg_depts["SGE"].id, degree_level="postgraduate"),
            Program(name="Master of Development Studies (MDS)", department_id=pg_depts["BIGD"].id, degree_level="postgraduate"),
            Program(name="Master of Arts in Governance and Development (MAGD)", department_id=pg_depts["BIGD"].id, degree_level="postgraduate"),
            Program(name="Master of Science in Mental Health and Psychosocial Support (MHPSS)", department_id=pg_depts["BIGD"].id, degree_level="postgraduate"),
        ]

        db.add_all(ug_programs + pg_programs)
        db.commit()
    finally:
        db.close()
