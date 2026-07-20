"""Orchestrates risk prediction and recommendation generation."""

from __future__ import annotations

from sqlalchemy.orm import Session

from app.modules.academic.exceptions import StudentProfileNotFoundException
from app.modules.academic.grades_service import GradesService
from app.modules.intelligence.features import FeatureBuilder
from app.modules.intelligence.ml_models import models_available, predict_with_ml, train_models
from app.modules.intelligence.recommendations import generate_recommendations
from app.modules.intelligence.repository import IntelligenceRepository
from app.modules.intelligence.risk_rules import rule_based_risk
from app.models.course_offering import CourseOffering
from app.models.instructor import Instructor
from sqlalchemy.orm import joinedload


def _serialize_prediction(row, feature_row: dict | None = None) -> dict:
    offering = getattr(row, "course_offering", None)
    course = getattr(offering, "course", None) if offering else None
    return {
        "id": str(row.id),
        "student_id": str(row.student_id),
        "offering_id": str(row.course_offering_id) if row.course_offering_id else None,
        "course_code": course.course_code if course else (feature_row or {}).get("course_code"),
        "course_title": course.title if course else (feature_row or {}).get("course_title"),
        "risk_score": row.risk_score,
        "risk_level": row.risk_level,
        "model_version": row.model_version,
        "features_snapshot": row.features_snapshot,
        "explanation": row.explanation,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "student_code": (feature_row or {}).get("student_id"),
        "student_name": (feature_row or {}).get("student_name"),
    }


def _serialize_recommendation(row) -> dict:
    return {
        "id": str(row.id),
        "type": row.type,
        "title": row.title,
        "message": row.message,
        "priority": row.priority,
        "source": row.source,
        "course_code": row.course_code,
        "course_offering_id": str(row.course_offering_id) if row.course_offering_id else None,
        "is_active": bool(row.is_active),
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }


class IntelligenceService:
    def __init__(self) -> None:
        self.features = FeatureBuilder()
        self.repo = IntelligenceRepository()
        self.grades = GradesService()

    def _resolve_risk(self, feature_row: dict) -> dict:
        ml = predict_with_ml(feature_row) if models_available() else None
        if ml:
            return ml
        return rule_based_risk(feature_row)

    def predict_and_recommend_for_row(self, db: Session, feature_row: dict, replace_recs: bool = True) -> dict:
        risk = self._resolve_risk(feature_row)
        pred = self.repo.upsert_prediction(
            db,
            student_id=feature_row["student_uuid"],
            offering_id=feature_row["offering_id"],
            risk_score=risk["risk_score"],
            risk_level=risk["risk_level"],
            model_version=risk["model_version"],
            features_snapshot=feature_row.get("features") or {},
            explanation=risk.get("explanation"),
        )
        rec_items = generate_recommendations(feature_row, risk)
        if replace_recs:
            self.repo.deactivate_recommendations(db, feature_row["student_uuid"], feature_row["offering_id"])
            created = self.repo.create_recommendations(db, feature_row["student_uuid"], rec_items)
        else:
            created = []
        return {
            "prediction": _serialize_prediction(pred, feature_row),
            "recommendations": [_serialize_recommendation(r) for r in created] if created else rec_items,
        }

    def refresh_student_offering(self, db: Session, user_id: str, offering_id: str) -> dict:
        student = self.repo.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()
        feature_row = self.features.build_for_student_offering(db, user_id, offering_id)
        return self.predict_and_recommend_for_row(db, feature_row)

    def refresh_student_all(self, db: Session, user_id: str) -> dict:
        student = self.repo.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()
        overview = self.grades.get_student_grades_overview(db, user_id)
        results = []
        for course in overview:
            oid = course.get("offering_id")
            if not oid:
                continue
            try:
                results.append(self.refresh_student_offering(db, user_id, oid))
            except Exception:
                continue
        recs = self.repo.list_active_recommendations(db, str(student.id))
        preds = self.repo.list_predictions_for_student(db, str(student.id))
        return {
            "refreshed": len(results),
            "predictions": [_serialize_prediction(p) for p in preds],
            "recommendations": [_serialize_recommendation(r) for r in recs],
            "summary": self._student_summary(preds),
        }

    def get_student_insights(self, db: Session, user_id: str) -> dict:
        student = self.repo.get_student_by_user_id(db, user_id)
        if not student:
            raise StudentProfileNotFoundException()
        preds = self.repo.list_predictions_for_student(db, str(student.id))
        recs = self.repo.list_active_recommendations(db, str(student.id))
        # Auto-generate if empty
        if not preds:
            return self.refresh_student_all(db, user_id)
        return {
            "predictions": [_serialize_prediction(p) for p in preds],
            "recommendations": [_serialize_recommendation(r) for r in recs],
            "summary": self._student_summary(preds),
            "ml_model_ready": models_available(),
        }

    def _student_summary(self, preds) -> dict:
        levels = {"low": 0, "medium": 0, "high": 0}
        for p in preds:
            lvl = getattr(p, "risk_level", None) or (p.get("risk_level") if isinstance(p, dict) else None)
            if lvl in levels:
                levels[lvl] += 1
        return {
            "total_courses": len(preds),
            "high_risk": levels["high"],
            "medium_risk": levels["medium"],
            "low_risk": levels["low"],
        }

    def refresh_instructor_offering(self, db: Session, user_id: str, offering_id: str) -> dict:
        rows = self.features.build_for_offering(db, user_id, offering_id)
        results = []
        for feature_row in rows:
            try:
                results.append(self.predict_and_recommend_for_row(db, feature_row))
            except Exception:
                continue
        preds = self.repo.list_predictions_for_offering(db, offering_id)
        serialized = []
        by_uuid = {r["student_uuid"]: r for r in rows}
        for p in preds:
            fr = by_uuid.get(str(p.student_id))
            item = _serialize_prediction(p, fr)
            if p.student:
                item["student_name"] = f"{p.student.first_name} {p.student.last_name}"
                item["student_code"] = p.student.student_id
            serialized.append(item)

        levels = {"low": 0, "medium": 0, "high": 0}
        for s in serialized:
            if s.get("risk_level") in levels:
                levels[s["risk_level"]] += 1

        return {
            "offering_id": offering_id,
            "refreshed": len(results),
            "predictions": sorted(serialized, key=lambda x: x.get("risk_score") or 0, reverse=True),
            "distribution": levels,
            "ml_model_ready": models_available(),
        }

    def get_instructor_offering_risk(self, db: Session, user_id: str, offering_id: str) -> dict:
        # Ensure offering ownership via grades service
        self.grades._get_owned_offering(db, user_id, offering_id)
        preds = self.repo.list_predictions_for_offering(db, offering_id)
        if not preds:
            return self.refresh_instructor_offering(db, user_id, offering_id)
        serialized = []
        for p in preds:
            item = _serialize_prediction(p)
            if p.student:
                item["student_name"] = f"{p.student.first_name} {p.student.last_name}"
                item["student_code"] = p.student.student_id
            serialized.append(item)
        levels = {"low": 0, "medium": 0, "high": 0}
        for s in serialized:
            if s.get("risk_level") in levels:
                levels[s["risk_level"]] += 1
        return {
            "offering_id": offering_id,
            "predictions": sorted(serialized, key=lambda x: x.get("risk_score") or 0, reverse=True),
            "distribution": levels,
            "ml_model_ready": models_available(),
        }

    def train(self, db: Session) -> dict:
        corpus = self.features.build_training_corpus(db)
        return train_models(corpus)

    def refresh_offering_by_system(self, db: Session, offering_id: str) -> None:
        """Best-effort refresh after grade/attendance updates (no requesting user)."""
        offering = (
            db.query(CourseOffering)
            .options(joinedload(CourseOffering.instructor))
            .filter(CourseOffering.id == offering_id)
            .first()
        )
        if not offering or not offering.instructor or not offering.instructor.user_id:
            return
        try:
            self.refresh_instructor_offering(db, str(offering.instructor.user_id), str(offering.id))
        except Exception:
            pass
