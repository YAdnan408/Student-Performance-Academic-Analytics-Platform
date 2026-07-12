from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.error_handlers import add_exception_handlers
from app.modules.auth.router import router as auth_router
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
    from app.models.course import Course
    from app.models.semester import Semester
    from app.models.enums import CourseStatus
    from sqlalchemy import inspect
    from datetime import date
    inspector = inspect(engine)
    if not inspector.has_table("courses"):
        return
    db = SessionLocal()
    try:
        # Seed courses
        if db.query(Course).count() == 0:
            courses_data = [
                {
                    "course_code": "CSE101",
                    "title": "Introduction to Computer Science",
                    "description": "A comprehensive introduction to computer science covering algorithms, data structures, and computational thinking. Students will learn fundamental programming concepts and problem-solving techniques.",
                    "cost": 15000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                },
                {
                    "course_code": "CSE201",
                    "title": "Data Structures & Algorithms",
                    "description": "In-depth study of data structures including arrays, linked lists, trees, graphs, and hash tables. Analysis of algorithms for sorting, searching, and graph operations.",
                    "cost": 16500.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                },
                {
                    "course_code": "CSE301",
                    "title": "Database Management Systems",
                    "description": "Design and implementation of database systems. Topics include relational models, SQL, normalization, transaction processing, and NoSQL databases.",
                    "cost": 16000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 15, "lab": 5, "attendance": 5},
                },
                {
                    "course_code": "EEE101",
                    "title": "Basic Electrical Engineering",
                    "description": "Fundamentals of electrical engineering including circuit analysis, electromagnetism, transformers, and electrical machines.",
                    "cost": 14000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 40, "quiz": 10, "assignments": 10, "lab": 10, "attendance": 5},
                },
                {
                    "course_code": "MAT101",
                    "title": "Calculus I",
                    "description": "Limits, derivatives, and integrals of single-variable functions. Applications in physics, engineering, and economics.",
                    "cost": 12000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 30, "final": 40, "quiz": 10, "assignments": 10, "lab": 0, "attendance": 10},
                },
                {
                    "course_code": "BUS101",
                    "title": "Principles of Management",
                    "description": "An introduction to the fundamental principles of management including planning, organizing, leading, and controlling organizational resources.",
                    "cost": 13000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 30, "final": 40, "quiz": 10, "assignments": 15, "lab": 0, "attendance": 5},
                },
                {
                    "course_code": "CSE250",
                    "title": "Software Engineering",
                    "description": "Software development lifecycle, requirements engineering, design patterns, testing, and project management methodologies including Agile and Scrum.",
                    "cost": 15500.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 35, "quiz": 10, "assignments": 15, "lab": 10, "attendance": 5},
                },
                {
                    "course_code": "CSE350",
                    "title": "Artificial Intelligence",
                    "description": "Study of intelligent agents, search algorithms, knowledge representation, machine learning fundamentals, and neural networks.",
                    "cost": 17000.0,
                    "duration": "16 weeks",
                    "start_date": date(2026, 5, 15),
                    "end_date": date(2026, 9, 1),
                    "marks_distribution": {"mid": 25, "final": 35, "quiz": 10, "assignments": 15, "lab": 10, "attendance": 5},
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
