"""Pure helpers for GPA and grade analytics."""

from __future__ import annotations
from typing import Optional


def compute_cgpa(courses: list[dict]) -> Optional[float]:
    """Simple non-credit CGPA: mean grade points for courses with any graded work."""
    graded = [
        c for c in courses
        if c.get("grade_points") is not None and (c.get("graded_weight") or 0) > 0
    ]
    if not graded:
        return None
    return round(sum(c["grade_points"] for c in graded) / len(graded), 2)


def build_gpa_trend(courses: list[dict]) -> list[dict]:
    return [
        {
            "offering_id": c.get("offering_id"),
            "course_code": c.get("course_code"),
            "title": c.get("title"),
            "total_marks": c.get("total_marks"),
            "grade_points": c.get("grade_points"),
            "letter_grade": c.get("letter_grade"),
            "is_complete": c.get("is_complete"),
            "graded_weight": c.get("graded_weight"),
            "total_weight": c.get("total_weight"),
        }
        for c in sorted(courses, key=lambda x: x.get("course_code") or "")
    ]


def best_weakest(courses: list[dict]) -> tuple[Optional[dict], Optional[dict]]:
    graded = [
        c for c in courses
        if c.get("grade_points") is not None and (c.get("graded_weight") or 0) > 0
    ]
    if not graded:
        return None, None
    ranked = sorted(graded, key=lambda c: c["grade_points"], reverse=True)
    return ranked[0], ranked[-1] if len(ranked) > 1 else None


def generate_gpa_insights(courses: list[dict], cgpa: Optional[float]) -> list[str]:
    insights: list[str] = []
    graded = [
        c for c in courses
        if c.get("grade_points") is not None and (c.get("graded_weight") or 0) > 0
    ]
    if cgpa is not None:
        insights.append(f"Your CGPA across {len(graded)} graded course(s) is {cgpa:.2f}.")
    if len(graded) >= 2:
        ordered = sorted(graded, key=lambda x: x.get("course_code") or "")
        prev, curr = ordered[-2], ordered[-1]
        delta = round(curr["grade_points"] - prev["grade_points"], 2)
        if delta > 0:
            insights.append(
                f"Your grade points in {curr['course_code']} improved by {delta:.2f} compared to {prev['course_code']}."
            )
        elif delta < 0:
            insights.append(
                f"Your grade points in {curr['course_code']} dropped by {abs(delta):.2f} compared to {prev['course_code']}."
            )
    best, weak = best_weakest(courses)
    if best:
        insights.append(f"Strongest performance: {best['course_code']} ({best['letter_grade']}, {best['grade_points']:.1f} GP).")
    if weak and best and weak["offering_id"] != best["offering_id"]:
        insights.append(f"Needs attention: {weak['course_code']} ({weak['letter_grade']}, {weak['grade_points']:.1f} GP).")
    incomplete = [c for c in courses if not c.get("is_complete") and (c.get("graded_weight") or 0) > 0]
    if incomplete:
        insights.append(f"{len(incomplete)} course(s) still have provisional grades — totals may change.")
    return insights[:4]


def grade_distribution(students: list[dict]) -> list[dict]:
    buckets = [
        ("90-100", 90, 100.1),
        ("80-89", 80, 90),
        ("70-79", 70, 80),
        ("60-69", 60, 70),
        ("Below 60", 0, 60),
    ]
    graded = [s for s in students if (s.get("graded_weight") or 0) > 0]
    result = []
    for label, lo, hi in buckets:
        count = sum(1 for s in graded if lo <= (s.get("total_marks") or 0) < hi)
        result.append({"range": label, "count": count})
    return result


def at_risk_by_grades(students: list[dict], threshold: float = 60.0) -> list[dict]:
    at_risk = []
    for s in students:
        if (s.get("graded_weight") or 0) <= 0:
            continue
        total = s.get("total_marks") or 0
        if total < threshold or (s.get("grade_points") or 4) < 2.0:
            at_risk.append({
                "student_id": s.get("student_id"),
                "student_name": s.get("student_name"),
                "total_marks": total,
                "letter_grade": s.get("letter_grade"),
                "grade_points": s.get("grade_points"),
            })
    return sorted(at_risk, key=lambda x: x["total_marks"])


def assessment_class_averages(columns: list[dict], students: list[dict], edit_lookup=None) -> list[dict]:
    """Average raw marks per assessment column across students."""
    rows = []
    for col in columns:
        aid = col["id"]
        marks = []
        for s in students:
            val = None
            for comp in (s.get("components") or {}).values():
                for a in comp.get("assessments") or []:
                    if a.get("assessment_id") == aid and a.get("marks_obtained") is not None:
                        val = a["marks_obtained"]
                        break
                if val is not None:
                    break
            if val is not None:
                marks.append(float(val))
        exam_max = col.get("total_marks") or 0
        avg_pct = round((sum(marks) / len(marks) / exam_max) * 100, 1) if marks and exam_max > 0 else None
        rows.append({
            "assessment_id": aid,
            "csv_column": col.get("csv_column"),
            "title": col.get("title"),
            "type": col.get("type"),
            "average_marks": round(sum(marks) / len(marks), 1) if marks else None,
            "average_percentage": avg_pct,
            "graded_count": len(marks),
        })
    return rows
