"""Rule-based personalized academic recommendations."""

from __future__ import annotations


PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def generate_recommendations(feature_row: dict, risk: dict, limit: int = 8) -> list[dict]:
    f = feature_row.get("features") or {}
    code = feature_row.get("course_code") or "this course"
    title = feature_row.get("course_title") or code
    offering_id = feature_row.get("offering_id")
    risk_level = risk.get("risk_level") or "low"
    recs: list[dict] = []

    def add(rtype: str, priority: str, message: str, source: str = "rule_based", title_text: str | None = None):
        recs.append({
            "type": rtype,
            "priority": priority,
            "message": message,
            "source": source,
            "title": title_text or f"{rtype.replace('_', ' ').title()} — {code}",
            "course_code": code,
            "course_title": title,
            "course_offering_id": offering_id,
        })

    att = float(f.get("attendance_pct") or 0)
    if float(f.get("missing_attendance") or 0) < 1.0:
        if att < 70:
            add("attendance", "high", f"Your attendance in {code} — {title} is {att:.0f}%. Aim for at least 80% to avoid academic risk.")
        elif att < 80:
            add("attendance", "medium", f"Attendance in {code} is {att:.0f}%. Try to reach 80%+ for a safer standing.")

    for key, label, miss_key in [
        ("quiz_pct", "quizzes", "missing_quiz"),
        ("assignment_pct", "assignments", "missing_assignment"),
        ("lab_pct", "labs", "missing_lab"),
        ("midterm_pct", "midterm", "missing_midterm"),
        ("final_pct", "final", "missing_final"),
    ]:
        if float(f.get(miss_key) or 0) >= 1.0:
            continue
        pct = float(f.get(key) or 0)
        if pct < 50:
            add("assessment", "high", f"Your {label} performance in {code} is {pct:.0f}%. Prioritize practice and review for upcoming assessments.")
        elif pct < 60:
            add("assessment", "medium", f"{label.capitalize()} average in {code} is {pct:.0f}%. Focus on improving this component.")

    ratio = float(f.get("graded_weight_ratio") or 0)
    scaled = float(f.get("scaled_total") or 0)
    if ratio >= 0.3 and scaled < 60:
        add("progress", "high", f"Provisional scaled total in {code} is {scaled:.0f}/100. Remaining assessments can still change your letter grade — plan carefully.")
    elif ratio < 0.25 and float(f.get("missing_midterm") or 0) < 1 and float(f.get("midterm_pct") or 0) == 0:
        pass
    elif ratio < 0.4 and float(f.get("missing_midterm") or 0) >= 1:
        add("completion", "low", f"Only {ratio * 100:.0f}% of {code} is graded so far. Stay consistent on quizzes, assignments, and labs before major exams.")

    if risk_level == "high":
        add(
            "risk",
            "high",
            f"You are currently high risk in {code} — {title}. Improve attendance and focus on the weakest graded components first.",
            source="ml_based" if (risk.get("model_version") or "").startswith(("logreg", "rf", "xgb", "ensemble")) else "rule_based",
        )
    elif risk_level == "medium":
        add(
            "risk",
            "medium",
            f"Medium academic risk detected for {code}. Small improvements in attendance and assessments can lower your risk.",
            source="ml_based" if (risk.get("model_version") or "").startswith(("logreg", "rf", "xgb", "ensemble")) else "rule_based",
        )

    prior = float(f.get("prior_cgpa") or 0)
    if prior > 0 and prior < 2.5 and scaled < 70 and ratio >= 0.2:
        add("gpa", "medium", f"Your prior CGPA is {prior:.2f}. Stronger results in {code} will help stabilize overall performance.")

    recs.sort(key=lambda r: PRIORITY_ORDER.get(r["priority"], 9))
    # Deduplicate by type+message prefix
    seen = set()
    unique = []
    for r in recs:
        key = (r["type"], r["message"][:60])
        if key in seen:
            continue
        seen.add(key)
        unique.append(r)
    return unique[:limit]
