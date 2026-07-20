from __future__ import annotations

from sqlalchemy.orm import Session, joinedload

from app.models.ml_prediction import MLPrediction
from app.models.recommendation import Recommendation
from app.models.student import Student
from app.models.course_offering import CourseOffering


class IntelligenceRepository:
    def upsert_prediction(
        self,
        db: Session,
        *,
        student_id: str,
        offering_id: str,
        risk_score: float,
        risk_level: str,
        model_version: str,
        features_snapshot: dict,
        explanation: dict | None,
    ) -> MLPrediction:
        existing = (
            db.query(MLPrediction)
            .filter(
                MLPrediction.student_id == student_id,
                MLPrediction.course_offering_id == offering_id,
            )
            .order_by(MLPrediction.created_at.desc())
            .first()
        )
        if existing:
            existing.risk_score = risk_score
            existing.risk_level = risk_level
            existing.model_version = model_version
            existing.features_snapshot = features_snapshot
            existing.explanation = explanation
            db.commit()
            db.refresh(existing)
            return existing

        row = MLPrediction(
            student_id=student_id,
            course_offering_id=offering_id,
            risk_score=risk_score,
            risk_level=risk_level,
            model_version=model_version,
            features_snapshot=features_snapshot,
            explanation=explanation,
        )
        db.add(row)
        db.commit()
        db.refresh(row)
        return row

    def list_predictions_for_student(self, db: Session, student_id: str, limit: int = 20) -> list[MLPrediction]:
        return (
            db.query(MLPrediction)
            .options(joinedload(MLPrediction.course_offering).joinedload(CourseOffering.course))
            .filter(MLPrediction.student_id == student_id)
            .order_by(MLPrediction.created_at.desc())
            .limit(limit)
            .all()
        )

    def list_predictions_for_offering(self, db: Session, offering_id: str) -> list[MLPrediction]:
        # latest per student
        rows = (
            db.query(MLPrediction)
            .options(joinedload(MLPrediction.student))
            .filter(MLPrediction.course_offering_id == offering_id)
            .order_by(MLPrediction.created_at.desc())
            .all()
        )
        latest = {}
        for r in rows:
            sid = str(r.student_id)
            if sid not in latest:
                latest[sid] = r
        return list(latest.values())

    def deactivate_recommendations(self, db: Session, student_id: str, offering_id: str | None = None) -> None:
        q = db.query(Recommendation).filter(
            Recommendation.student_id == student_id,
            Recommendation.is_active == True,  # noqa: E712
        )
        if offering_id:
            q = q.filter(Recommendation.course_offering_id == offering_id)
        q.update({"is_active": False}, synchronize_session=False)
        db.commit()

    def create_recommendations(self, db: Session, student_id: str, items: list[dict]) -> list[Recommendation]:
        created = []
        for item in items:
            row = Recommendation(
                student_id=student_id,
                course_offering_id=item.get("course_offering_id"),
                course_code=item.get("course_code"),
                title=item.get("title"),
                type=item.get("type"),
                message=item.get("message"),
                priority=item.get("priority"),
                source=item.get("source") or "rule_based",
                is_active=True,
            )
            db.add(row)
            created.append(row)
        db.commit()
        for row in created:
            db.refresh(row)
        return created

    def list_active_recommendations(self, db: Session, student_id: str, limit: int = 20) -> list[Recommendation]:
        return (
            db.query(Recommendation)
            .filter(
                Recommendation.student_id == student_id,
                Recommendation.is_active == True,  # noqa: E712
            )
            .order_by(Recommendation.created_at.desc())
            .limit(limit)
            .all()
        )

    def get_student_by_user_id(self, db: Session, user_id: str) -> Student | None:
        return db.query(Student).filter(Student.user_id == user_id).first()
