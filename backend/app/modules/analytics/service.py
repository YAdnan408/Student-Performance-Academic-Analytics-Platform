from sqlalchemy.orm import Session, joinedload
from app.modules.analytics.interfaces import IAnalyticsRepository
from app.modules.academic.exceptions import (
    StudentProfileNotFoundException,
    InstructorProfileNotFoundException,
    CourseNotFoundException,
)
from app.models.enrollment import Enrollment
from app.models.course_offering import CourseOffering
from datetime import date, timedelta


class AnalyticsService:
    def __init__(self, repository: IAnalyticsRepository):
        self.repository = repository

    def get_attendance_heatmap(self, db: Session, user_id: str) -> dict:
        from app.modules.academic.repository import AcademicRepository
        acad_repo = AcademicRepository(db)
        student = acad_repo.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        records = self.repository.get_attendance_for_student(db, str(student.id))
        heatmap = {}
        for record in records:
            day_name = record.date.strftime("%A")
            week_num = record.date.isocalendar()[1]
            key = f"{day_name}_{week_num}"
            heatmap[key] = record.status

        return {
            "heatmap": heatmap,
            "total_records": len(records),
        }

    def get_student_analytics_overview(self, db: Session, user_id: str) -> dict:
        from app.modules.academic.repository import AcademicRepository
        acad_repo = AcademicRepository(db)
        student = acad_repo.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()

        enrollments = self.repository.get_student_enrollments(db, str(student.id))
        records = self.repository.get_attendance_for_student(db, str(student.id))

        total_present = sum(1 for r in records if r.status == "present")
        total_absent = sum(1 for r in records if r.status == "absent")
        total_late = sum(1 for r in records if r.status == "late")
        grand_total = len(records)
        attendance_pct = ((total_present + total_late) / grand_total * 100) if grand_total > 0 else 0

        course_breakdown = []
        for enrollment in enrollments:
            course = enrollment.course_offering.course
            course_records = [r for r in records if str(r.enrollment_id) == str(enrollment.id)]
            p = sum(1 for r in course_records if r.status == "present")
            a = sum(1 for r in course_records if r.status == "absent")
            l = sum(1 for r in course_records if r.status == "late")
            t = len(course_records)
            pct = ((p + l) / t * 100) if t > 0 else 0
            course_breakdown.append({
                "course_id": str(course.id),
                "course_title": course.title,
                "course_code": course.course_code,
                "attendance_percentage": round(pct, 1),
                "total_classes": t,
                "present": p,
                "absent": a,
                "late": l,
            })

        return {
            "total_courses": len(enrollments),
            "overall_attendance_percentage": round(attendance_pct, 1),
            "total_classes": grand_total,
            "present_count": total_present,
            "absent_count": total_absent,
            "late_count": total_late,
            "course_breakdown": course_breakdown,
        }

    def get_instructor_analytics_overview(self, db: Session, user_id: str) -> dict:
        from app.modules.academic.repository import AcademicRepository
        acad_repo = AcademicRepository(db)
        instructor = acad_repo.get_instructor_by_user_id(db, user_id)
        if not instructor:
            raise InstructorProfileNotFoundException()

        offerings = (
            db.query(Enrollment.course_offering_id)
            .join(CourseOffering, Enrollment.course_offering_id == CourseOffering.id)
            .filter(CourseOffering.instructor_id == instructor.id)
            .distinct()
            .all()
        )

        total_students = 0
        course_stats = []

        for (offering_id,) in offerings:
            enrollments = self.repository.get_enrollments_by_offering(db, offering_id)
            records = self.repository.get_attendance_for_offering(db, offering_id)
            total_students += len(enrollments)

            total_present = sum(1 for r in records if r.status == "present")
            total_absent = sum(1 for r in records if r.status == "absent")
            total_late = sum(1 for r in records if r.status == "late")
            total = len(records)
            pct = ((total_present + total_late) / total * 100) if total > 0 else 0

            offering = db.query(CourseOffering).options(
                joinedload(CourseOffering.course)
            ).filter(CourseOffering.id == offering_id).first()

            at_risk = 0
            for enrollment in enrollments:
                student_records = [r for r in records if str(r.enrollment_id) == str(enrollment.id)]
                sp = sum(1 for r in student_records if r.status == "present")
                sl = sum(1 for r in student_records if r.status == "late")
                st = len(student_records)
                spct = ((sp + sl) / st * 100) if st > 0 else 100
                if spct < 75:
                    at_risk += 1

            course_stats.append({
                "offering_id": str(offering_id),
                "course_title": offering.course.title if offering else "Unknown",
                "course_code": offering.course.course_code if offering else "",
                "enrolled_students": len(enrollments),
                "attendance_percentage": round(pct, 1),
                "total_attendance_records": total,
                "students_at_risk": at_risk,
            })

        return {
            "total_courses": len(offerings),
            "total_students": total_students,
            "course_stats": course_stats,
        }

    def get_course_weekly_trend(self, db: Session, user_id: str, offering_id: str) -> dict:
        from app.modules.academic.repository import AcademicRepository
        acad_repo = AcademicRepository(db)
        instructor = acad_repo.get_instructor_by_user_id(db, user_id)
        if not instructor:
            raise InstructorProfileNotFoundException()

        offering = acad_repo.get_offering_by_id(db, offering_id)
        if not offering:
            raise CourseNotFoundException("Course offering not found")

        if str(offering.instructor_id) != str(instructor.id):
            from app.modules.academic.exceptions import InstructorNotAssignedException
            raise InstructorNotAssignedException()

        records = self.repository.get_attendance_for_offering(db, offering_id)
        weekly_map = {}
        for record in records:
            iso_year, iso_week, _ = record.date.isocalendar()
            week_key = f"{iso_year}-W{iso_week:02d}"
            if week_key not in weekly_map:
                weekly_map[week_key] = {"total": 0, "present": 0, "absent": 0, "late": 0}
            weekly_map[week_key]["total"] += 1
            weekly_map[week_key][record.status] += 1

        weekly_trend = []
        for week_key in sorted(weekly_map.keys()):
            w = weekly_map[week_key]
            pct = ((w["present"] + w["late"]) / w["total"] * 100) if w["total"] > 0 else 0
            weekly_trend.append({
                "week": week_key,
                "percentage": round(pct, 1),
            })

        return {
            "offering_id": offering_id,
            "weekly_trend": weekly_trend,
        }
