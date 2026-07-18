"""PDF report builders using ReportLab."""

from __future__ import annotations

from datetime import datetime
from io import BytesIO
from zoneinfo import ZoneInfo

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

BD_TZ = ZoneInfo("Asia/Dhaka")

TYPE_LABELS = {
    "quiz": "Quiz",
    "assignment": "Assignment",
    "lab": "Lab",
    "midterm": "Midterm",
    "final": "Final",
    "attendance": "Attendance",
}

COMPONENT_ORDER = ["quiz", "assignment", "lab", "attendance", "midterm", "final"]


def _generated_at() -> str:
    return datetime.now(BD_TZ).strftime("%d %b %Y, %I:%M %p %Z")


def _build_pdf(title: str, subtitle: str, elements: list) -> bytes:
    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=48,
        leftMargin=48,
        topMargin=48,
        bottomMargin=48,
    )
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontSize=18,
        spaceAfter=6,
        textColor=colors.HexColor("#1e1b4b"),
    )
    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontSize=10,
        textColor=colors.HexColor("#64748b"),
        spaceAfter=16,
    )
    body = [
        Paragraph(title, title_style),
        Paragraph(f"{subtitle}<br/>Generated: {_generated_at()}", subtitle_style),
        *elements,
    ]
    doc.build(body)
    return buffer.getvalue()


def _table(rows: list[list], col_widths: list[float] | None = None) -> Table:
    table = Table(rows, colWidths=col_widths, repeatRows=1)
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#312e81")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.HexColor("#e2e8f0")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def _section_heading(text: str, styles) -> Paragraph:
    return Paragraph(
        f"<b>{text}</b>",
        ParagraphStyle("Section", parent=styles["Normal"], fontSize=11, spaceBefore=12, spaceAfter=8),
    )


def build_student_course_performance_pdf(data: dict) -> bytes:
    styles = getSampleStyleSheet()
    elements = []

    info_rows = [
        ["Student", data["student_name"]],
        ["Student ID", data["student_code"] or "—"],
        ["Course", f"{data['course_code']} — {data['course_title']}"],
        ["Instructor", data.get("instructor_name") or "—"],
    ]
    elements.append(_table([["Field", "Value"], *info_rows], [1.8 * inch, 4.5 * inch]))
    elements.append(Spacer(1, 12))

    summary_rows = [
        ["Total Marks", f"{data['total_marks']}%"],
        ["Letter Grade", data.get("letter_grade") or "—"],
        ["Grade Points", f"{data['grade_points']:.1f}" if data.get("grade_points") is not None else "—"],
        ["Status", "Final" if data.get("is_complete") else f"Provisional ({data.get('graded_weight', 0)}/{data.get('total_weight', 0)} graded)"],
        ["Course Attendance", f"{data.get('attendance_percentage', 0)}%"],
    ]
    elements.append(_section_heading("Performance Summary", styles))
    elements.append(_table([["Metric", "Value"], *summary_rows], [2.2 * inch, 4.1 * inch]))
    elements.append(Spacer(1, 12))

    components = data.get("components") or {}
    comp_rows = [["Component", "Weight", "Contribution", "Component %"]]
    for atype in COMPONENT_ORDER:
        comp = components.get(atype)
        if not comp:
            continue
        comp_rows.append([
            TYPE_LABELS.get(atype, atype),
            str(comp.get("weight", "—")),
            str(comp.get("contribution") if comp.get("contribution") is not None else "—"),
            str(comp.get("component_percentage") if comp.get("component_percentage") is not None else "—"),
        ])
    if len(comp_rows) > 1:
        elements.append(_section_heading("Component Breakdown", styles))
        elements.append(_table(comp_rows, [1.5 * inch, 0.9 * inch, 1.2 * inch, 1.2 * inch]))
        elements.append(Spacer(1, 12))

    assessment_rows = [["Assessment", "Type", "Marks", "Max", "Percentage"]]
    for atype in COMPONENT_ORDER:
        comp = components.get(atype)
        if not comp:
            continue
        for a in comp.get("assessments") or []:
            seq = a.get("sequence_number")
            title = a.get("title") or TYPE_LABELS.get(atype, atype)
            if seq:
                title = f"{title} #{seq}"
            assessment_rows.append([
                title,
                TYPE_LABELS.get(atype, atype),
                str(a.get("marks_obtained") if a.get("marks_obtained") is not None else "—"),
                str(a.get("exam_max") or "—"),
                str(a.get("percentage") if a.get("percentage") is not None else "—"),
            ])
    if len(assessment_rows) > 1:
        elements.append(_section_heading("Assessment Details", styles))
        elements.append(_table(assessment_rows, [2.0 * inch, 1.0 * inch, 0.8 * inch, 0.8 * inch, 1.0 * inch]))

    return _build_pdf(
        "Course Performance Report",
        f"{data['course_code']} — {data['course_title']}",
        elements,
    )


def build_student_course_attendance_pdf(data: dict) -> bytes:
    styles = getSampleStyleSheet()
    elements = []

    info_rows = [
        ["Student", data["student_name"]],
        ["Student ID", data["student_code"] or "—"],
        ["Course", f"{data['course_code']} — {data['course_title']}"],
    ]
    elements.append(_table([["Field", "Value"], *info_rows], [1.8 * inch, 4.5 * inch]))
    elements.append(Spacer(1, 12))

    summary_rows = [
        ["Total Classes", str(data.get("total_classes", 0))],
        ["Present", str(data.get("present", 0))],
        ["Absent", str(data.get("absent", 0))],
        ["Late", str(data.get("late", 0))],
        ["Attendance %", f"{data.get('percentage', 0)}%"],
    ]
    elements.append(_section_heading("Attendance Summary", styles))
    elements.append(_table([["Metric", "Value"], *summary_rows], [2.2 * inch, 4.1 * inch]))
    elements.append(Spacer(1, 12))

    log_rows = [["Date", "Status"]]
    for r in data.get("records") or []:
        log_rows.append([r.get("date", "—"), (r.get("status") or "—").capitalize()])
    if len(log_rows) > 1:
        elements.append(_section_heading("Attendance Log", styles))
        elements.append(_table(log_rows, [2.5 * inch, 2.5 * inch]))

    return _build_pdf(
        "Course Attendance Report",
        f"{data['course_code']} — {data['course_title']}",
        elements,
    )


def build_student_performance_summary_pdf(data: dict) -> bytes:
    styles = getSampleStyleSheet()
    elements = []

    info_rows = [
        ["Student", data["student_name"]],
        ["Student ID", data["student_code"] or "—"],
        ["CGPA", f"{data['cgpa']:.2f}" if data.get("cgpa") is not None else "—"],
        ["Graded Courses", str(data.get("graded_courses", 0))],
        ["Total Enrollments", str(data.get("total_courses", 0))],
        ["Overall Attendance", f"{data.get('overall_attendance_percentage', 0)}%"],
    ]
    elements.append(_table([["Field", "Value"], *info_rows], [2.2 * inch, 4.1 * inch]))
    elements.append(Spacer(1, 12))

    if data.get("insights"):
        elements.append(_section_heading("Academic Insights", styles))
        for msg in data["insights"]:
            elements.append(Paragraph(f"• {msg}", styles["Normal"]))
        elements.append(Spacer(1, 12))

    course_rows = [["Course", "Total %", "Letter Grade", "Grade Points", "Status"]]
    for c in data.get("courses") or []:
        course_rows.append([
            f"{c.get('course_code')} — {c.get('title')}",
            str(c.get("total_marks", "—")),
            str(c.get("letter_grade") or "—"),
            f"{c['grade_points']:.1f}" if c.get("grade_points") is not None else "—",
            "Final" if c.get("is_complete") else "Provisional",
        ])
    if len(course_rows) > 1:
        elements.append(_section_heading("Course Grades", styles))
        elements.append(_table(course_rows, [2.2 * inch, 0.8 * inch, 1.0 * inch, 1.0 * inch, 0.9 * inch]))

    return _build_pdf("Academic Performance Summary", data["student_name"], elements)


def build_instructor_class_grades_pdf(data: dict) -> bytes:
    styles = getSampleStyleSheet()
    elements = []

    info_rows = [
        ["Course", f"{data['course_code']} — {data['course_title']}"],
        ["Instructor", data.get("instructor_name") or "—"],
        ["Class Average", f"{data.get('class_average')}%" if data.get("class_average") is not None else "—"],
        ["Students Graded", f"{data.get('students_graded', 0)}/{data.get('total_students', 0)}"],
    ]
    elements.append(_table([["Field", "Value"], *info_rows], [2.0 * inch, 4.3 * inch]))
    elements.append(Spacer(1, 12))

    dist_rows = [["Grade Range", "Students"]]
    for bucket in data.get("distribution") or []:
        dist_rows.append([bucket.get("range", "—"), str(bucket.get("count", 0))])
    if len(dist_rows) > 1:
        elements.append(_section_heading("Grade Distribution", styles))
        elements.append(_table(dist_rows, [2.5 * inch, 2.5 * inch]))
        elements.append(Spacer(1, 12))

    at_risk = data.get("at_risk_students") or []
    if at_risk:
        risk_rows = [["Student ID", "Name", "Total %"]]
        for s in at_risk:
            risk_rows.append([s.get("student_id", "—"), s.get("student_name", "—"), str(s.get("total_marks", "—"))])
        elements.append(_section_heading("At-Risk Students", styles))
        elements.append(_table(risk_rows, [1.2 * inch, 2.8 * inch, 1.0 * inch]))
        elements.append(Spacer(1, 12))

    avg_rows = [["Assessment", "Class Avg %"]]
    for a in data.get("assessment_averages") or []:
        if a.get("average_percentage") is not None:
            avg_rows.append([a.get("csv_column", "—"), str(a.get("average_percentage"))])
    if len(avg_rows) > 1:
        elements.append(_section_heading("Assessment Averages", styles))
        elements.append(_table(avg_rows, [3.5 * inch, 1.5 * inch]))
        elements.append(Spacer(1, 12))

    columns = data.get("columns") or []
    header = ["Student ID", "Name", "Total %", "Grade"] + [c.get("csv_column", "") for c in columns]
    grade_rows = [header]
    for s in data.get("students") or []:
        row = [
            s.get("student_id", "—"),
            s.get("student_name", "—"),
            str(s.get("total_marks", "—")),
            str(s.get("letter_grade") or "—"),
        ]
        comp_map = {}
        for atype, comp in (s.get("components") or {}).items():
            for a in comp.get("assessments") or []:
                comp_map[a.get("assessment_id")] = a.get("marks_obtained")
        for col in columns:
            row.append(str(comp_map.get(col.get("id")) if comp_map.get(col.get("id")) is not None else "—"))
        grade_rows.append(row)

    elements.append(_section_heading("Gradebook", styles))
    col_count = len(header)
    width = 6.3 / col_count
    elements.append(_table(grade_rows, [width * inch] * col_count))

    if data.get("insight"):
        elements.append(Spacer(1, 12))
        elements.append(Paragraph(f"<i>{data['insight']}</i>", styles["Normal"]))

    return _build_pdf(
        "Class Grade Report",
        f"{data['course_code']} — {data['course_title']}",
        elements,
    )


def build_instructor_class_attendance_pdf(data: dict) -> bytes:
    styles = getSampleStyleSheet()
    elements = []

    info_rows = [
        ["Course", f"{data['course_code']} — {data['course_title']}"],
        ["Instructor", data.get("instructor_name") or "—"],
        ["Total Students", str(data.get("total_students", 0))],
        ["Classes Recorded", str(data.get("total_classes_recorded", 0))],
        ["Class Average Attendance", f"{data.get('class_average_percentage', 0)}%"],
    ]
    elements.append(_table([["Field", "Value"], *info_rows], [2.2 * inch, 4.1 * inch]))
    elements.append(Spacer(1, 12))

    student_rows = [["Student ID", "Name", "Present", "Absent", "Late", "Attendance %"]]
    for s in data.get("students") or []:
        student_rows.append([
            s.get("student_code") or "—",
            s.get("student_name", "—"),
            str(s.get("present", 0)),
            str(s.get("absent", 0)),
            str(s.get("late", 0)),
            f"{s.get('percentage', 0)}%",
        ])
    elements.append(_section_heading("Student Attendance", styles))
    elements.append(_table(student_rows, [1.0 * inch, 1.8 * inch, 0.7 * inch, 0.7 * inch, 0.7 * inch, 1.0 * inch]))

    return _build_pdf(
        "Class Attendance Report",
        f"{data['course_code']} — {data['course_title']}",
        elements,
    )
