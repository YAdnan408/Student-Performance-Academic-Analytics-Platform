"""
Deterministic grading engine.

Raw marks are stored per assessment. This module:
1. Scales each assessment: (marks / exam_max) * 100 → percentage
2. Aggregates a component (quiz/assignment/lab) using drop-lowest
3. Scales component percentage to marks_distribution weight
4. Maps final course total to letter grade / grade points
"""

from __future__ import annotations
from typing import Optional


# Marks distribution keys → AssessmentType values
DIST_TO_TYPE = {
    "mid": "midterm",
    "final": "final",
    "quiz": "quiz",
    "assignments": "assignment",
    "lab": "lab",
    "attendance": "attendance",
}

TYPE_TO_DIST = {v: k for k, v in DIST_TO_TYPE.items()}

# Singleton components use the type name only; multi-use components append _{n}
SINGLETON_CSV_TYPES = {"midterm", "final", "attendance"}


def assessment_csv_column(component_type: str, sequence_number: int = 1) -> str:
    if component_type in SINGLETON_CSV_TYPES:
        return component_type
    seq = sequence_number or 1
    return f"{component_type}_{seq}"


def total_active_weight(marks_distribution: Optional[dict]) -> float:
    return sum(active_components(marks_distribution).values())

# University grading scale (from campus policy screenshot)
# Ranges are [min, max) except the top which is inclusive 100
GRADE_SCALE = [
    (97, 100.0001, "A+", 4.0),
    (90, 97, "A", 4.0),
    (85, 90, "A-", 3.7),
    (80, 85, "B+", 3.3),
    (75, 80, "B", 3.0),
    (70, 75, "B-", 2.7),
    (65, 70, "C+", 2.3),
    (60, 65, "C", 2.0),
    (57, 60, "C-", 1.7),
    (55, 57, "D+", 1.3),
    (52, 55, "D", 1.0),
    (50, 52, "D-", 0.7),
    (0, 50, "F", 0.0),
]


def letter_grade_for(score: float) -> tuple[str, float]:
    """Return (letter, grade_points) for a course total out of 100."""
    if score is None:
        return ("", 0.0)
    s = max(0.0, float(score))
    for lo, hi, letter, points in GRADE_SCALE:
        if lo <= s < hi:
            return (letter, points)
    if s >= 100:
        return ("A+", 4.0)
    return ("F", 0.0)


def normalize_score(marks_obtained: Optional[float], exam_max: Optional[float]) -> Optional[float]:
    """Convert raw marks to a 0–100 percentage. Returns None if not graded."""
    if marks_obtained is None or exam_max is None or exam_max <= 0:
        return None
    return max(0.0, min(100.0, (float(marks_obtained) / float(exam_max)) * 100.0))


def aggregate_percentages(percentages: list[float], drop_lowest: int = 0) -> Optional[float]:
    """Average after dropping the lowest N scores. Returns None if no scores."""
    if not percentages:
        return None
    sorted_scores = sorted(percentages)
    drop = max(0, min(drop_lowest, len(sorted_scores) - 1)) if len(sorted_scores) > 1 else 0
    kept = sorted_scores[drop:] if drop else sorted_scores
    if not kept:
        return None
    return sum(kept) / len(kept)


def component_contribution(
    percentages: list[float],
    weight: float,
    drop_lowest: int = 0,
) -> Optional[float]:
    """Scale aggregated component % to course weight points."""
    if weight <= 0:
        return 0.0
    avg = aggregate_percentages(percentages, drop_lowest)
    if avg is None:
        return None
    return (avg / 100.0) * weight


def active_components(marks_distribution: Optional[dict]) -> dict[str, float]:
    """Return component_type → weight for weights > 0."""
    if not marks_distribution:
        return {}
    result = {}
    for dist_key, weight in marks_distribution.items():
        try:
            w = float(weight or 0)
        except (TypeError, ValueError):
            w = 0.0
        if w <= 0:
            continue
        atype = DIST_TO_TYPE.get(dist_key)
        if atype:
            result[atype] = w
    return result


def compute_student_course_grade(
    marks_distribution: Optional[dict],
    policies: dict[str, dict],
    assessments_by_type: dict[str, list[dict]],
    grades_by_assessment: dict[str, Optional[float]],
) -> dict:
    """
    Compute full course grade for one student.

    policies: {component_type: {planned_count, drop_lowest}}
    assessments_by_type: {component_type: [{id, total_marks, ...}, ...]}
    grades_by_assessment: {assessment_id: marks_obtained | None}
    """
    components = {}
    total = 0.0
    graded_weight = 0.0
    active = active_components(marks_distribution)

    for atype, weight in active.items():
        assessments = assessments_by_type.get(atype, [])
        policy = policies.get(atype, {})
        drop_lowest = int(policy.get("drop_lowest") or 0)

        percentages = []
        assessment_details = []
        for a in assessments:
            aid = str(a["id"])
            raw = grades_by_assessment.get(aid)
            exam_max = a.get("total_marks") or 0
            pct = normalize_score(raw, exam_max) if raw is not None else None
            assessment_details.append({
                "assessment_id": aid,
                "title": a.get("title"),
                "sequence_number": a.get("sequence_number"),
                "exam_max": exam_max,
                "marks_obtained": raw,
                "percentage": round(pct, 2) if pct is not None else None,
            })
            if pct is not None:
                percentages.append(pct)

        contribution = component_contribution(percentages, weight, drop_lowest)
        components[atype] = {
            "weight": weight,
            "drop_lowest": drop_lowest,
            "assessments": assessment_details,
            "component_percentage": round(aggregate_percentages(percentages, drop_lowest) or 0, 2) if percentages else None,
            "contribution": round(contribution, 2) if contribution is not None else None,
        }
        if contribution is not None:
            total += contribution
            graded_weight += weight

    letter, points = letter_grade_for(total)
    full_weight = total_active_weight(marks_distribution)
    is_complete = full_weight > 0 and graded_weight >= full_weight - 0.01
    return {
        "components": components,
        "total_marks": round(total, 2),
        "graded_weight": round(graded_weight, 2),
        "total_weight": round(full_weight, 2),
        "is_complete": is_complete,
        "letter_grade": letter if is_complete else ("Pending" if graded_weight > 0 else None),
        "grade_points": points if is_complete else None,
    }
