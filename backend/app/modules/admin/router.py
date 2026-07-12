from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.core.database import get_db
from app.modules.auth.dependencies import get_current_user, RoleChecker
from app.models.user import User
from app.models.course import Course
from app.models.course_offering import CourseOffering
from app.models.enrollment import Enrollment
from app.models.assessment import Assessment
from app.models.grade import Grade
from app.models.attendance import Attendance
from app.models.payment import Payment
from app.models.semester import Semester
from app.models.instructor import Instructor
from app.models.student import Student
from app.models.enums import CourseStatus
from app.modules.admin.schema import CourseCreateRequest, CourseUpdateRequest, AssignInstructorRequest
from app.core.exceptions import NotFoundException
from datetime import date
import uuid

router = APIRouter(prefix="/admin", tags=["Admin"])
admin_only = RoleChecker(["admin"])


@router.get("/courses")
def admin_list_courses(
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    courses = db.query(Course).order_by(Course.created_at.desc()).all()
    result = []
    for course in courses:
        offerings = db.query(CourseOffering).filter(
            CourseOffering.course_id == course.id
        ).first()
        instructor_name = None
        instructor_id = None
        if offerings and offerings.instructor:
            instructor_name = f"{offerings.instructor.first_name} {offerings.instructor.last_name}"
            instructor_id = str(offerings.instructor_id)
        result.append({
            "id": str(course.id),
            "course_code": course.course_code,
            "title": course.title,
            "description": course.description,
            "cost": course.cost,
            "duration": course.duration,
            "start_date": str(course.start_date) if course.start_date else None,
            "end_date": str(course.end_date) if course.end_date else None,
            "marks_distribution": course.marks_distribution,
            "class_schedule": course.class_schedule,
            "status": course.status,
            "instructor_name": instructor_name,
            "instructor_id": instructor_id,
        })
    return result


@router.post("/courses")
def admin_create_course(
    request: CourseCreateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    course = Course(
        course_code=request.course_code,
        title=request.title,
        description=request.description,
        cost=request.cost,
        duration=request.duration,
        start_date=date.fromisoformat(request.start_date) if request.start_date else None,
        end_date=date.fromisoformat(request.end_date) if request.end_date else None,
        marks_distribution=request.marks_distribution,
        class_schedule=request.class_schedule,
    )
    db.add(course)
    db.commit()
    db.refresh(course)
    return {
        "id": str(course.id),
        "course_code": course.course_code,
        "title": course.title,
        "message": "Course created successfully",
    }


@router.put("/courses/{course_id}")
def admin_update_course(
    course_id: str,
    request: CourseUpdateRequest,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise NotFoundException("Course not found")

    if request.course_code is not None:
        course.course_code = request.course_code
    if request.title is not None:
        course.title = request.title
    if request.description is not None:
        course.description = request.description
    if request.cost is not None:
        course.cost = request.cost
    if request.duration is not None:
        course.duration = request.duration
    if request.start_date is not None:
        course.start_date = date.fromisoformat(request.start_date)
    if request.end_date is not None:
        course.end_date = date.fromisoformat(request.end_date)
    if request.marks_distribution is not None:
        course.marks_distribution = request.marks_distribution
    if request.class_schedule is not None:
        course.class_schedule = request.class_schedule

    if request.instructor_id is not None:
        existing = db.query(CourseOffering).filter(
            CourseOffering.course_id == course_id
        ).first()
        if request.instructor_id:
            instructor = db.query(Instructor).filter(Instructor.id == request.instructor_id).first()
            if not instructor:
                raise NotFoundException("Instructor not found")
            if existing:
                existing.instructor_id = request.instructor_id
            else:
                semester = db.query(Semester).first()
                if not semester:
                    semester = Semester(
                        name="Summer 2026",
                        start_date=date(2026, 5, 1),
                        end_date=date(2026, 8, 31),
                    )
                    db.add(semester)
                    db.flush()
                offering = CourseOffering(
                    course_id=course_id,
                    instructor_id=request.instructor_id,
                    semester_id=semester.id,
                )
                db.add(offering)
        else:
            if existing:
                db.delete(existing)

    db.commit()
    db.refresh(course)
    return {
        "id": str(course.id),
        "course_code": course.course_code,
        "title": course.title,
        "message": "Course updated successfully",
    }


@router.delete("/courses/{course_id}")
def admin_delete_course(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise NotFoundException("Course not found")

    offerings = db.query(CourseOffering).filter(CourseOffering.course_id == course_id).all()
    offering_ids = [o.id for o in offerings]

    if offering_ids:
        enrollments = db.query(Enrollment).filter(Enrollment.course_offering_id.in_(offering_ids)).all()
        enrollment_ids = [e.id for e in enrollments]

        assessments = db.query(Assessment).filter(Assessment.course_offering_id.in_(offering_ids)).all()
        assessment_ids = [a.id for a in assessments]

        if assessment_ids:
            db.query(Grade).filter(Grade.assessment_id.in_(assessment_ids)).delete(synchronize_session=False)
        if enrollment_ids:
            db.query(Attendance).filter(Attendance.enrollment_id.in_(enrollment_ids)).delete(synchronize_session=False)
            db.query(Payment).filter(Payment.enrollment_id.in_(enrollment_ids)).delete(synchronize_session=False)
        if assessment_ids:
            db.query(Assessment).filter(Assessment.course_offering_id.in_(offering_ids)).delete(synchronize_session=False)
        if enrollment_ids:
            db.query(Enrollment).filter(Enrollment.course_offering_id.in_(offering_ids)).delete(synchronize_session=False)

        db.query(CourseOffering).filter(CourseOffering.course_id == course_id).delete()

    db.delete(course)
    db.commit()
    return {"message": "Course deleted successfully"}


@router.post("/courses/{course_id}/renew")
def admin_renew_course(
    course_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    course = db.query(Course).filter(Course.id == course_id).first()
    if not course:
        raise NotFoundException("Course not found")

    if course.status != CourseStatus.archived.value:
        return {"message": "Course is not in archived state", "status": course.status}

    course.status = CourseStatus.active.value
    db.commit()
    db.refresh(course)
    return {
        "id": str(course.id),
        "title": course.title,
        "status": course.status,
        "message": "Course renewed successfully",
    }


@router.get("/courses/archived")
def admin_list_archived_courses(
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    courses = db.query(Course).filter(Course.status == CourseStatus.archived.value).order_by(Course.created_at.desc()).all()
    result = []
    for course in courses:
        result.append({
            "id": str(course.id),
            "course_code": course.course_code,
            "title": course.title,
            "description": course.description,
            "cost": course.cost,
            "duration": course.duration,
            "start_date": str(course.start_date) if course.start_date else None,
            "end_date": str(course.end_date) if course.end_date else None,
            "status": course.status,
        })
    return result


@router.get("/instructors")
def admin_list_instructors(
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    instructors = db.query(Instructor).all()
    result = []
    for inst in instructors:
        course_count = db.query(CourseOffering).filter(
            CourseOffering.instructor_id == inst.id
        ).count()
        result.append({
            "id": str(inst.id),
            "user_id": str(inst.user_id),
            "employee_id": inst.employee_id,
            "first_name": inst.first_name,
            "last_name": inst.last_name,
            "designation": inst.designation,
            "phone": inst.phone,
            "email": inst.user.email if inst.user else None,
            "active_courses_count": course_count,
        })
    return result


@router.post("/assign-instructor")
def admin_assign_instructor(
    request: AssignInstructorRequest,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    course = db.query(Course).filter(Course.id == request.course_id).first()
    if not course:
        raise NotFoundException("Course not found")

    instructor = db.query(Instructor).filter(Instructor.id == request.instructor_id).first()
    if not instructor:
        raise NotFoundException("Instructor not found")

    semester = None
    if request.semester_id:
        semester = db.query(Semester).filter(Semester.id == request.semester_id).first()
    if not semester:
        semester = db.query(Semester).first()
        if not semester:
            semester = Semester(
                name="Summer 2026",
                start_date=date(2026, 5, 1),
                end_date=date(2026, 8, 31),
            )
            db.add(semester)
            db.flush()

    existing = db.query(CourseOffering).filter(
        CourseOffering.course_id == request.course_id,
        CourseOffering.instructor_id == request.instructor_id,
        CourseOffering.semester_id == semester.id,
    ).first()

    if existing:
        return {
            "message": "Instructor already assigned to this course for the semester",
            "offering_id": str(existing.id),
        }

    offering = CourseOffering(
        course_id=request.course_id,
        instructor_id=request.instructor_id,
        semester_id=semester.id,
    )
    db.add(offering)
    db.commit()
    db.refresh(offering)

    return {
        "message": f"Instructor {instructor.first_name} {instructor.last_name} assigned to {course.title}",
        "offering_id": str(offering.id),
    }


@router.get("/users")
def admin_list_users(
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    users = db.query(User).order_by(User.created_at.desc()).all()
    result = []
    for u in users:
        profile = None
        if u.role == "student" and u.student:
            profile = {
                "name": f"{u.student.first_name} {u.student.last_name}",
                "student_id": u.student.student_id,
            }
        elif u.role == "instructor" and u.instructor:
            profile = {
                "name": f"{u.instructor.first_name} {u.instructor.last_name}",
                "employee_id": u.instructor.employee_id,
            }
        result.append({
            "id": str(u.id),
            "email": u.email,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": str(u.created_at) if u.created_at else None,
            "profile": profile,
        })
    return result


@router.delete("/users/{user_id}")
def admin_delete_user(
    user_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(admin_only),
):
    user_to_delete = db.query(User).filter(User.id == user_id).first()
    if not user_to_delete:
        raise NotFoundException("User not found")

    if str(user_to_delete.id) == str(user.id):
        return {"message": "Cannot delete yourself"}, 400

    user_to_delete.is_active = False
    db.commit()
    return {"message": f"User {user_to_delete.email} has been deactivated"}
