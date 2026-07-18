from fastapi import APIRouter, Depends, UploadFile, File, Form, Response
from sqlalchemy.orm import Session
from typing import Optional
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.modules.academic.service import AcademicService
from app.modules.academic.grades_service import GradesService
from app.modules.academic.dependencies import get_academic_service, get_grades_service
from app.modules.academic.schema import (
    EnrollRequest,
    CheckClashRequest,
    MarkAttendanceRequest,
    BulkAttendanceRequest,
    EditAttendanceRequest,
    UpsertGradingPoliciesRequest,
    CreateAssessmentRequest,
    UpdateAssessmentRequest,
    UpsertGradesRequest,
    UpsertMultiGradesRequest,
    CreateMaterialRequest,
)
from app.modules.profile.storage import storage_provider
from app.models.enums import MaterialType

router = APIRouter(prefix="/academic", tags=["Academic"])


@router.get("/courses")
def list_courses(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.list_courses(db)


@router.get("/courses/{course_id}")
def get_course_detail(
    course_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.get_course_detail(db, course_id, str(user.id))


@router.post("/check-clash")
def check_schedule_clash(
    request: CheckClashRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.check_schedule_clash(db, str(user.id), request.course_id)


@router.post("/enroll")
def enroll_course(
    request: EnrollRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.enroll_student(db, str(user.id), request.course_id, request.payment_method)


@router.get("/my-courses")
def my_courses(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(get_current_user),
):
    return service.get_my_courses(db, str(user.id))


@router.get("/instructor/my-courses")
def instructor_my_courses(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return AcademicService.get_instructor_courses(db, str(user.id))


@router.post("/attendance/mark")
def mark_attendance(
    request: MarkAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.mark_attendance(db, str(user.id), request.enrollment_id, request.date, request.status.value)


@router.post("/attendance/bulk")
def bulk_mark_attendance(
    request: BulkAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    records = [{"enrollment_id": r.enrollment_id, "status": r.status.value} for r in request.records]
    return service.bulk_mark_attendance(db, str(user.id), request.offering_id, request.date, records)


@router.put("/attendance/edit")
def edit_attendance(
    request: EditAttendanceRequest,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.edit_attendance(db, str(user.id), request.attendance_id, request.status.value)


@router.get("/attendance/course/{offering_id}")
def get_course_attendance(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_course_attendance(db, str(user.id), offering_id)


@router.get("/attendance/my")
def get_my_attendance(
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_my_attendance(db, str(user.id))


@router.get("/attendance/course/{offering_id}/date/{attendance_date}")
def get_course_attendance_for_date(
    offering_id: str,
    attendance_date: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return service.get_course_attendance_for_date(db, str(user.id), offering_id, attendance_date)


@router.get("/attendance/course/{offering_id}/student")
def get_student_attendance_for_course(
    offering_id: str,
    db: Session = Depends(get_db),
    service: AcademicService = Depends(get_academic_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return service.get_student_attendance_for_course(db, str(user.id), offering_id)


# ═══════════════════════════════════════════════════════════════════
# Grades / Assessments / Materials / Notifications
# ═══════════════════════════════════════════════════════════════════

@router.get("/offerings/{offering_id}/hub")
def get_offering_hub(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(get_current_user),
):
    role = user.role.value if hasattr(user.role, "value") else user.role
    return grades.get_offering_hub(db, str(user.id), offering_id, role)


@router.get("/offerings/{offering_id}/grading-policies")
def get_grading_policies(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.get_grading_policies(db, str(user.id), offering_id)


@router.put("/offerings/{offering_id}/grading-policies")
def upsert_grading_policies(
    offering_id: str,
    request: UpsertGradingPoliciesRequest,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.upsert_grading_policies(db, str(user.id), offering_id, request.policies)


@router.get("/offerings/{offering_id}/assessments")
def list_assessments(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(get_current_user),
):
    role = user.role.value if hasattr(user.role, "value") else user.role
    return grades.list_assessments(db, str(user.id), offering_id, role)


@router.post("/offerings/{offering_id}/assessments")
def create_assessment(
    offering_id: str,
    request: CreateAssessmentRequest,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.create_assessment(db, str(user.id), offering_id, request)


@router.put("/assessments/{assessment_id}")
def update_assessment(
    assessment_id: str,
    request: UpdateAssessmentRequest,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.update_assessment(db, str(user.id), assessment_id, request)


@router.delete("/assessments/{assessment_id}")
def delete_assessment(
    assessment_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.delete_assessment(db, str(user.id), assessment_id)


@router.post("/assessments/{assessment_id}/file")
async def upload_assessment_file(
    assessment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    allowed = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg"}
    ext = ("." + file.filename.rsplit(".", 1)[-1].lower()) if file.filename and "." in file.filename else ""
    if ext not in allowed:
        from app.modules.academic.exceptions import AssessmentValidationException
        raise AssessmentValidationException(f"File type {ext or 'unknown'} not allowed")
    content = await file.read()
    import io
    path = await storage_provider.upload(io.BytesIO(content), file.filename or "file.pdf")
    url = storage_provider.get_url(path)
    return grades.set_assessment_file(db, str(user.id), assessment_id, url)


@router.get("/assessments/{assessment_id}/grades")
def get_assessment_grades(
    assessment_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.get_assessment_grades(db, str(user.id), assessment_id)


@router.put("/assessments/{assessment_id}/grades")
def upsert_assessment_grades(
    assessment_id: str,
    request: UpsertGradesRequest,
    notify: bool = False,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.upsert_grades(db, str(user.id), assessment_id, request.grades, notify=notify)


@router.get("/assessments/{assessment_id}/grades/template")
def download_single_grade_template(
    assessment_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    csv_content = grades.csv_template_single(db, str(user.id), assessment_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="grades_{assessment_id}.csv"'},
    )


@router.post("/assessments/{assessment_id}/grades/import")
async def import_single_grades_csv(
    assessment_id: str,
    file: UploadFile = File(...),
    notify: bool = False,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    content = (await file.read()).decode("utf-8-sig")
    return grades.import_csv_single(db, str(user.id), assessment_id, content, notify=notify)


@router.put("/offerings/{offering_id}/grades/multi")
def upsert_multi_grades(
    offering_id: str,
    request: UpsertMultiGradesRequest,
    notify: bool = False,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.upsert_multi_grades(db, str(user.id), offering_id, request.rows, notify=notify)


@router.get("/offerings/{offering_id}/grades/template")
def download_multi_grade_template(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    csv_content = grades.csv_template_multi(db, str(user.id), offering_id)
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="grades_{offering_id}.csv"'},
    )


@router.post("/offerings/{offering_id}/grades/import")
async def import_multi_grades_csv(
    offering_id: str,
    file: UploadFile = File(...),
    notify: bool = False,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    content = (await file.read()).decode("utf-8-sig")
    return grades.import_csv_multi(db, str(user.id), offering_id, content, notify=notify)


@router.delete("/offerings/{offering_id}/grades")
def clear_offering_grades(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.clear_all_grades(db, str(user.id), offering_id)


@router.get("/offerings/{offering_id}/gradebook")
def get_gradebook(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.get_offering_gradebook(db, str(user.id), offering_id)


@router.get("/grades/my")
def get_my_grades(
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return grades.get_student_grades_overview(db, str(user.id))


@router.get("/offerings/{offering_id}/grades/me")
def get_my_offering_grades(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["student"])),
):
    return grades.get_student_offering_grades(db, str(user.id), offering_id)


@router.get("/offerings/{offering_id}/materials")
def list_materials(
    offering_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(get_current_user),
):
    role = user.role.value if hasattr(user.role, "value") else user.role
    return grades.list_materials(db, str(user.id), offering_id, role)


@router.post("/offerings/{offering_id}/materials")
async def create_material(
    offering_id: str,
    title: str = Form(...),
    material_type: str = Form(...),
    description: Optional[str] = Form(None),
    external_url: Optional[str] = Form(None),
    sort_order: int = Form(0),
    file: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    file_url = None
    file_name = None
    if file and file.filename:
        allowed = {".pdf", ".doc", ".docx", ".ppt", ".pptx", ".png", ".jpg", ".jpeg", ".mp4", ".webm"}
        ext = ("." + file.filename.rsplit(".", 1)[-1].lower()) if "." in file.filename else ""
        if ext not in allowed:
            from app.modules.academic.exceptions import AssessmentValidationException
            raise AssessmentValidationException(f"File type {ext or 'unknown'} not allowed")
        import io
        content = await file.read()
        path = await storage_provider.upload(io.BytesIO(content), file.filename)
        file_url = storage_provider.get_url(path)
        file_name = file.filename

    data = CreateMaterialRequest(
        title=title,
        description=description,
        material_type=MaterialType(material_type),
        external_url=external_url,
        sort_order=sort_order,
    )
    return grades.create_material(db, str(user.id), offering_id, data, file_url, file_name)


@router.delete("/materials/{material_id}")
def delete_material(
    material_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(RoleChecker(["instructor"])),
):
    return grades.delete_material(db, str(user.id), material_id)


@router.get("/notifications")
def list_notifications(
    unread_only: bool = False,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(get_current_user),
):
    return grades.list_notifications(db, str(user.id), unread_only)


@router.post("/notifications/{notification_id}/read")
def mark_notification_read(
    notification_id: str,
    db: Session = Depends(get_db),
    grades: GradesService = Depends(get_grades_service),
    user: User = Depends(get_current_user),
):
    return grades.mark_notification_read(db, str(user.id), notification_id)
