"""Rule-based academic risk scoring (fallback and cold-start)."""

from __future__ import annotations

from typing import Optional


def risk_level_from_score(score: float) -> str:
    if score >= 0.7:
        return "high"
    if score >= 0.4:
        return "medium"
    return "low"


def rule_based_risk(feature_row: dict) -> dict:
    """
    Produce risk_score in [0,1], risk_level, and explanation factors.
    Uses attendance, component gaps, provisional totals, and progress.
    """
    f = feature_row.get("features") or {}
    factors: list[dict] = []
    score = 0.0

    att = float(f.get("attendance_pct") or 0)
    if float(f.get("missing_attendance") or 0) < 1.0:
        if att < 60:
            score += 0.28
            factors.append({"factor": "attendance", "detail": f"Attendance is {att:.0f}% (critical)", "weight": 0.28})
        elif att < 75:
            score += 0.16
            factors.append({"factor": "attendance", "detail": f"Attendance is {att:.0f}% (below 75%)", "weight": 0.16})
        elif att < 80:
            score += 0.08
            factors.append({"factor": "attendance", "detail": f"Attendance is {att:.0f}% (below 80%)", "weight": 0.08})

    for key, label, miss_key, w_low, w_miss in [
        ("quiz_pct", "Quiz", "missing_quiz", 0.10, 0.0),
        ("assignment_pct", "Assignment", "missing_assignment", 0.10, 0.0),
        ("lab_pct", "Lab", "missing_lab", 0.12, 0.0),
        ("midterm_pct", "Midterm", "missing_midterm", 0.18, 0.0),
        ("final_pct", "Final", "missing_final", 0.20, 0.0),
    ]:
        if float(f.get(miss_key) or 0) >= 1.0:
            continue
        pct = float(f.get(key) or 0)
        if pct < 50:
            score += w_low + 0.05
            factors.append({"factor": key, "detail": f"{label} average is {pct:.0f}% (very low)", "weight": w_low + 0.05})
        elif pct < 60:
            score += w_low
            factors.append({"factor": key, "detail": f"{label} average is {pct:.0f}% (below 60%)", "weight": w_low})
        elif pct < 70:
            score += w_low * 0.5
            factors.append({"factor": key, "detail": f"{label} average is {pct:.0f}% (needs improvement)", "weight": round(w_low * 0.5, 3)})

    ratio = float(f.get("graded_weight_ratio") or 0)
    provisional = float(f.get("provisional_total") or 0)
    scaled = f.get("scaled_total")
    scaled_val = float(scaled) if scaled is not None else provisional

    if ratio >= 0.35 and scaled_val < 50:
        score += 0.22
        factors.append({"factor": "course_total", "detail": f"Provisional scaled total is {scaled_val:.0f}/100", "weight": 0.22})
    elif ratio >= 0.35 and scaled_val < 60:
        score += 0.15
        factors.append({"factor": "course_total", "detail": f"Provisional scaled total is {scaled_val:.0f}/100", "weight": 0.15})
    elif ratio >= 0.5 and scaled_val < 70:
        score += 0.08
        factors.append({"factor": "course_total", "detail": f"Provisional scaled total is {scaled_val:.0f}/100", "weight": 0.08})

    prior = float(f.get("prior_cgpa") or 0)
    if prior > 0 and prior < 2.0:
        score += 0.12
        factors.append({"factor": "prior_cgpa", "detail": f"Prior CGPA is {prior:.2f}", "weight": 0.12})
    elif prior > 0 and prior < 2.5:
        score += 0.06
        factors.append({"factor": "prior_cgpa", "detail": f"Prior CGPA is {prior:.2f}", "weight": 0.06})

    # Little graded work yet → dampen extreme scores
    if ratio < 0.15 and score > 0.55:
        score = 0.45
        factors.append({"factor": "progress", "detail": "Limited graded work so far — risk estimate is provisional", "weight": 0.0})

    score = max(0.0, min(1.0, round(score, 3)))
    factors.sort(key=lambda x: x.get("weight") or 0, reverse=True)
    return {
        "risk_score": score,
        "risk_level": risk_level_from_score(score),
        "model_version": "rules-v1",
        "explanation": {
            "source": "rule_based",
            "top_factors": factors[:5],
        },
    }
