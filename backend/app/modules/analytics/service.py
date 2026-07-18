from sqlalchemy.orm import Session, joinedload
from app.modules.analytics.interfaces import IAnalyticsRepository
from app.modules.academic.exceptions import (
    StudentProfileNotFoundException,
    InstructorProfileNotFoundException,
    CourseNotFoundException,
)
from app.models.enrollment import Enrollment
from app.models.course_offering import CourseOffering
from app.modules.analytics.grade_analytics import (
    assessment_class_averages,
    at_risk_by_grades,
    best_weakest,
    build_gpa_trend,
    compute_cgpa,
    generate_gpa_insights,
    grade_distribution,
)


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

    def get_student_gpa_analytics(self, db: Session, user_id: str) -> dict:
        from app.modules.academic.grades_service import GradesService

        courses = GradesService().get_student_grades_overview(db, user_id)
        cgpa = compute_cgpa(courses)
        best, weakest = best_weakest(courses)
        return {
            "cgpa": cgpa,
            "graded_courses": sum(1 for c in courses if (c.get("graded_weight") or 0) > 0),
            "total_courses": len(courses),
            "trend": build_gpa_trend(courses),
            "best_course": {
                "course_code": best["course_code"],
                "title": best["title"],
                "grade_points": best["grade_points"],
                "letter_grade": best["letter_grade"],
            } if best else None,
            "weakest_course": {
                "course_code": weakest["course_code"],
                "title": weakest["title"],
                "grade_points": weakest["grade_points"],
                "letter_grade": weakest["letter_grade"],
            } if weakest else None,
            "insights": generate_gpa_insights(courses, cgpa),
        }

    def get_student_dashboard(self, db: Session, user_id: str) -> dict:
        from app.modules.activity.logger import list_recent_activities
        from app.modules.analytics.deadlines import get_student_upcoming_deadlines

        attendance = self.get_student_analytics_overview(db, user_id)
        gpa = self.get_student_gpa_analytics(db, user_id)
        heatmap = self.get_attendance_heatmap(db, user_id)
        deadlines = get_student_upcoming_deadlines(db, user_id)
        return {
            "attendance": attendance,
            "gpa": gpa,
            "heatmap": heatmap,
            "recent_activity": list_recent_activities(db, user_id),
            "upcoming_deadlines": deadlines,
            "pending_tasks": len(deadlines),
        }

    def get_instructor_dashboard(self, db: Session, user_id: str) -> dict:
        from app.modules.activity.logger import list_recent_activities
        from app.modules.analytics.deadlines import get_instructor_upcoming_deadlines

        deadlines = get_instructor_upcoming_deadlines(db, user_id)
        return {
            "attendance": self.get_instructor_analytics_overview(db, user_id),
            "grades": self.get_instructor_grade_overview(db, user_id),
            "recent_activity": list_recent_activities(db, user_id),
            "upcoming_deadlines": deadlines,
            "pending_tasks": len(deadlines),
        }

    def _instructor_offerings(self, db: Session, user_id: str) -> list:
        from app.modules.academic.repository import AcademicRepository
        acad_repo = AcademicRepository(db)
        instructor = acad_repo.get_instructor_by_user_id(db, user_id)
        if not instructor:
            raise InstructorProfileNotFoundException()
        rows = (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.course))
            .filter(CourseOffering.instructor_id == instructor.id)
            .all()
        )
        return rows

    def get_instructor_grade_overview(self, db: Session, user_id: str) -> dict:
        from app.modules.academic.grades_service import GradesService

        gs = GradesService()
        course_stats = []
        for offering in self._instructor_offerings(db, user_id):
            try:
                gb = gs.get_offering_gradebook(db, user_id, str(offering.id))
            except Exception:
                continue
            students = gb.get("students") or []
            graded = [s for s in students if (s.get("graded_weight") or 0) > 0]
            totals = [s["total_marks"] for s in graded]
            class_avg = round(sum(totals) / len(totals), 1) if totals else None
            at_risk = len(at_risk_by_grades(students))
            below_60 = sum(1 for t in totals if t < 60)
            below_pct = round(below_60 / len(graded) * 100, 1) if graded else 0
            course_stats.append({
                "offering_id": str(offering.id),
                "course_code": offering.course.course_code,
                "course_title": offering.course.title,
                "enrolled_students": len(students),
                "class_average": class_avg,
                "students_graded": len(graded),
                "students_at_risk": at_risk,
                "below_60_percent": below_pct,
            })
        return {
            "total_courses": len(course_stats),
            "course_stats": course_stats,
        }

    def get_instructor_course_grade_analytics(self, db: Session, user_id: str, offering_id: str) -> dict:
        from app.modules.academic.grades_service import GradesService

        gb = GradesService().get_offering_gradebook(db, user_id, offering_id)
        students = gb.get("students") or []
        columns = gb.get("columns") or []
        graded = [s for s in students if (s.get("graded_weight") or 0) > 0]
        totals = [s["total_marks"] for s in graded]
        class_avg = round(sum(totals) / len(totals), 1) if totals else None
        ranked = sorted(graded, key=lambda s: s["total_marks"], reverse=True)
        at_risk = at_risk_by_grades(students)
        below_60 = sum(1 for t in totals if t < 60)
        insight = None
        if graded:
            pct = round(below_60 / len(graded) * 100, 1)
            insight = f"{pct}% of graded students scored below 60% in {gb.get('course_code')}."
        bottom_ranked = sorted(graded, key=lambda s: s["total_marks"])[:5]
        return {
            "offering_id": offering_id,
            "course_code": gb.get("course_code"),
            "course_title": gb.get("title"),
            "class_average": class_avg,
            "students_graded": len(graded),
            "total_students": len(students),
            "distribution": grade_distribution(students),
            "top_students": [
                {"student_id": s["student_id"], "student_name": s["student_name"], "total_marks": s["total_marks"], "letter_grade": s.get("letter_grade")}
                for s in ranked[:5]
            ],
            "bottom_students": [
                {"student_id": s["student_id"], "student_name": s["student_name"], "total_marks": s["total_marks"], "letter_grade": s.get("letter_grade")}
                for s in bottom_ranked
            ],
            "at_risk_students": at_risk[:10],
            "assessment_averages": assessment_class_averages(columns, students),
            "insight": insight,
        }
