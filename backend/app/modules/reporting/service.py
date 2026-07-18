"""Orchestrates report data collection and PDF generation."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.academic.grades_service import GradesService
from app.modules.academic.repository import AcademicRepository
from app.modules.academic.service import AcademicService
from app.modules.activity.logger import log_activity
from app.modules.analytics.repository import AnalyticsRepository
from app.modules.analytics.service import AnalyticsService
from app.modules.reporting import pdf_builder


class ReportingService:
    def __init__(self) -> None:
        self._grades = GradesService()

    def _analytics(self, db: Session) -> AnalyticsService:
        return AnalyticsService(AnalyticsRepository(db))

    def _student_profile(self, db: Session, user_id: str) -> dict:
        repo = AcademicRepository(db)
        student = repo.get_student_by_user_id(db, user_id)
        if not student:
            from app.modules.academic.exceptions import StudentProfileNotFoundException
            raise StudentProfileNotFoundException()
        return {
            "student_name": f"{student.first_name} {student.last_name}",
            "student_code": student.student_id,
        }

    def _instructor_profile(self, db: Session, user_id: str) -> dict:
        repo = AcademicRepository(db)
        instructor = repo.get_instructor_by_user_id(db, user_id)
        if not instructor:
            from app.modules.academic.exceptions import InstructorProfileNotFoundException
            raise InstructorProfileNotFoundException()
        return {
            "instructor_name": f"{instructor.first_name} {instructor.last_name}",
        }

    def _log_report(
        self,
        db: Session,
        user_id: str,
        report_label: str,
        *,
        course_code: str | None = None,
        course_title: str | None = None,
        offering_id: str | None = None,
        link: str | None = None,
    ) -> None:
        if course_code and course_title:
            message = f"downloaded {report_label} for {course_code} — {course_title}"
        else:
            message = f"downloaded {report_label}"
        log_activity(
            db, user_id, "report_downloaded",
            message,
            course_code=course_code,
            course_title=course_title,
            offering_id=offering_id,
            link=link,
        )

    def generate_student_course_performance(self, db: Session, user_id: str, offering_id: str) -> bytes:
        profile = self._student_profile(db, user_id)
        grades = self._grades.get_student_offering_grades(db, user_id, offering_id)
        academic = AcademicService(AcademicRepository(db))
        attendance = academic.get_student_attendance_for_course(db, user_id, offering_id)
        overview = self._grades.get_student_grades_overview(db, user_id)
        course_meta = next((c for c in overview if c.get("offering_id") == offering_id), None)

        payload = {
            **profile,
            "course_code": grades["course_code"],
            "course_title": grades["title"],
            "instructor_name": course_meta.get("instructor_name") if course_meta else None,
            "attendance_percentage": attendance.get("percentage", 0),
            **grades,
        }
        pdf = pdf_builder.build_student_course_performance_pdf(payload)
        self._log_report(
            db, user_id, "Course Performance Report",
            course_code=grades["course_code"],
            course_title=grades["title"],
            offering_id=offering_id,
            link="/student/reports",
        )
        return pdf

    def generate_student_course_attendance(self, db: Session, user_id: str, offering_id: str) -> bytes:
        profile = self._student_profile(db, user_id)
        academic = AcademicService(AcademicRepository(db))
        attendance = academic.get_student_attendance_for_course(db, user_id, offering_id)
        payload = {
            **profile,
            "course_code": attendance["course_code"],
            "course_title": attendance["course_title"],
            **attendance,
        }
        pdf = pdf_builder.build_student_course_attendance_pdf(payload)
        self._log_report(
            db, user_id, "Course Attendance Report",
            course_code=attendance["course_code"],
            course_title=attendance["course_title"],
            offering_id=offering_id,
            link="/student/reports",
        )
        return pdf

    def generate_student_performance_summary(self, db: Session, user_id: str) -> bytes:
        profile = self._student_profile(db, user_id)
        courses = self._grades.get_student_grades_overview(db, user_id)
        gpa = self._analytics(db).get_student_gpa_analytics(db, user_id)
        attendance = self._analytics(db).get_student_analytics_overview(db, user_id)
        payload = {
            **profile,
            "cgpa": gpa.get("cgpa"),
            "graded_courses": gpa.get("graded_courses", 0),
            "total_courses": gpa.get("total_courses", 0),
            "overall_attendance_percentage": attendance.get("overall_attendance_percentage", 0),
            "insights": gpa.get("insights") or [],
            "courses": courses,
        }
        pdf = pdf_builder.build_student_performance_summary_pdf(payload)
        self._log_report(db, user_id, "Academic Performance Summary", link="/student/reports")
        return pdf

    def generate_instructor_class_grades(self, db: Session, user_id: str, offering_id: str) -> bytes:
        profile = self._instructor_profile(db, user_id)
        gradebook = self._grades.get_offering_gradebook(db, user_id, offering_id)
        analytics = self._analytics(db).get_instructor_course_grade_analytics(db, user_id, offering_id)
        payload = {
            **profile,
            "course_code": gradebook["course_code"],
            "course_title": gradebook["title"],
            "columns": gradebook.get("columns") or [],
            "students": gradebook.get("students") or [],
            **analytics,
        }
        pdf = pdf_builder.build_instructor_class_grades_pdf(payload)
        self._log_report(
            db, user_id, "Class Grade Report",
            course_code=gradebook["course_code"],
            course_title=gradebook["title"],
            offering_id=offering_id,
            link="/instructor/reports",
        )
        return pdf

    def generate_instructor_class_attendance(self, db: Session, user_id: str, offering_id: str) -> bytes:
        profile = self._instructor_profile(db, user_id)
        academic = AcademicService(AcademicRepository(db))
        attendance = academic.get_course_attendance(db, user_id, offering_id)
        payload = {
            **profile,
            **attendance,
        }
        pdf = pdf_builder.build_instructor_class_attendance_pdf(payload)
        self._log_report(
            db, user_id, "Class Attendance Report",
            course_code=attendance.get("course_code"),
            course_title=attendance.get("course_title"),
            offering_id=offering_id,
            link="/instructor/reports",
        )
        return pdf
