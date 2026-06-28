from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.error_handlers import add_exception_handlers
from app.modules.auth.router import router as auth_router
from app.modules.departments.router import router as departments_router
from app.modules.profile.router import router as profile_router
from app.modules.academic.router import router as academic_router
from app.modules.admin.router import router as admin_router
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
app.include_router(academic_router)
app.include_router(admin_router)

# Mount uploads directory for static file serving
uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

@app.get("/")
async def root():
    return {"message": "Welcome to Student Performance & Academic Analytics API"}

@app.on_event("startup")
def seed_initial_data():
    from app.core.database import SessionLocal, engine
    from app.models.department import Department
    from app.models.program import Program
    from app.models.course import Course
    from app.models.semester import Semester
    from sqlalchemy import inspect
    from datetime import date
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
        db.flush()

        # Seed courses
        if db.query(Course).count() == 0:
            sdcs = db.query(Department).filter(Department.code == "SDCS").first()
            se = db.query(Department).filter(Department.code == "SE").first()
            bbs = db.query(Department).filter(Department.code == "BBS").first()

            courses_data = [
                {
                    "course_code": "CSE101",
                    "title": "Introduction to Computer Science",
                    "description": "A comprehensive introduction to computer science covering algorithms, data structures, and computational thinking. Students will learn fundamental programming concepts and problem-solving techniques.",
                    "credit_hours": 3,
                    "cost": 15000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                    "department_id": sdcs.id if sdcs else None,
                },
                {
                    "course_code": "CSE201",
                    "title": "Data Structures & Algorithms",
                    "description": "In-depth study of data structures including arrays, linked lists, trees, graphs, and hash tables. Analysis of algorithms for sorting, searching, and graph operations.",
                    "credit_hours": 3,
                    "cost": 16500.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                    "department_id": sdcs.id if sdcs else None,
                },
                {
                    "course_code": "CSE301",
                    "title": "Database Management Systems",
                    "description": "Design and implementation of database systems. Topics include relational models, SQL, normalization, transaction processing, and NoSQL databases.",
                    "credit_hours": 3,
                    "cost": 16000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 15, "lab": 5, "attendance": 5},
                    "department_id": sdcs.id if sdcs else None,
                },
                {
                    "course_code": "EEE101",
                    "title": "Basic Electrical Engineering",
                    "description": "Fundamentals of electrical engineering including circuit analysis, electromagnetism, transformers, and electrical machines.",
                    "credit_hours": 3,
                    "cost": 14000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                    "department_id": se.id if se else None,
                },
                {
                    "course_code": "MAT101",
                    "title": "Calculus I",
                    "description": "Limits, derivatives, and integrals of single-variable functions. Applications in physics, engineering, and economics.",
                    "credit_hours": 3,
                    "cost": 12000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 30, "final": 40, "quiz": 10, "assignments": 10, "lab": 0, "attendance": 10},
                    "department_id": sdcs.id if sdcs else None,
                },
                {
                    "course_code": "BUS101",
                    "title": "Principles of Management",
                    "description": "An introduction to the fundamental principles of management including planning, organizing, leading, and controlling organizational resources.",
                    "credit_hours": 3,
                    "cost": 13000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 30, "final": 40, "quiz": 10, "assignments": 15, "lab": 0, "attendance": 5},
                    "department_id": bbs.id if bbs else None,
                },
                {
                    "course_code": "CSE250",
                    "title": "Software Engineering",
                    "description": "Software development lifecycle, requirements engineering, design patterns, testing, and project management methodologies including Agile and Scrum.",
                    "credit_hours": 3,
                    "cost": 15500.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 35, "quiz": 10, "assignments": 15, "lab": 10, "attendance": 5},
                    "department_id": sdcs.id if sdcs else None,
                },
                {
                    "course_code": "CSE350",
                    "title": "Artificial Intelligence",
                    "description": "Study of intelligent agents, search algorithms, knowledge representation, machine learning fundamentals, and neural networks.",
                    "credit_hours": 3,
                    "cost": 17000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 35, "quiz": 10, "assignments": 15, "lab": 10, "attendance": 5},
                    "department_id": sdcs.id if sdcs else None,
                },
            ]

            for c_data in courses_data:
                course = Course(**c_data)
                db.add(course)

        # Seed semester
        if db.query(Semester).count() == 0:
            semester = Semester(
                name="Summer 2026",
                start_date=date(2026, 5, 1),
                end_date=date(2026, 8, 31),
            )
            db.add(semester)

        db.commit()
    finally:
        db.close()
