"""Train and run Logistic Regression, Random Forest, and XGBoost risk models."""

from __future__ import annotations

import json
import pickle
from pathlib import Path
from typing import Optional

from app.core.config import settings
from app.modules.intelligence.features import FEATURE_KEYS
from app.modules.intelligence.risk_rules import risk_level_from_score


MODEL_DIR = settings.ML_MODELS_DIR
META_FILE = "model_meta.json"
BUNDLE_FILE = "risk_models.pkl"


def _ensure_dir() -> Path:
    MODEL_DIR.mkdir(parents=True, exist_ok=True)
    return MODEL_DIR


def models_available() -> bool:
    return (MODEL_DIR / BUNDLE_FILE).exists()


def load_bundle() -> Optional[dict]:
    path = MODEL_DIR / BUNDLE_FILE
    if not path.exists():
        return None
    with open(path, "rb") as f:
        return pickle.load(f)


def save_bundle(bundle: dict) -> None:
    _ensure_dir()
    with open(MODEL_DIR / BUNDLE_FILE, "wb") as f:
        pickle.dump(bundle, f)
    meta = {
        "model_version": bundle.get("model_version"),
        "feature_keys": FEATURE_KEYS,
        "trained_samples": bundle.get("trained_samples"),
        "metrics": bundle.get("metrics"),
    }
    with open(MODEL_DIR / META_FILE, "w") as f:
        json.dump(meta, f, indent=2)


def _json_safe_float(value) -> float | None:
    """Convert numpy/sklearn floats to JSON-safe values (no NaN/Inf)."""
    import math
    try:
        f = float(value)
    except (TypeError, ValueError):
        return None
    if math.isnan(f) or math.isinf(f):
        return None
    return f


def train_models(corpus: list[dict]) -> dict:
    """Train LogReg, RandomForest, XGBoost on labeled feature rows."""
    import numpy as np
    from sklearn.ensemble import RandomForestClassifier
    from sklearn.linear_model import LogisticRegression
    from sklearn.model_selection import StratifiedKFold, cross_val_score
    from sklearn.pipeline import Pipeline
    from sklearn.preprocessing import StandardScaler

    labeled = [r for r in corpus if r.get("label") is not None]
    if len(labeled) < 8:
        from app.modules.intelligence.exceptions import InsufficientTrainingDataException
        raise InsufficientTrainingDataException(
            f"Need at least 8 labeled enrollments to train (found {len(labeled)})"
        )

    X = np.array([r["feature_vector"] for r in labeled], dtype=float)
    y = np.array([r["label"] for r in labeled], dtype=int)

    # If only one class, cannot train classifiers meaningfully
    if len(set(y.tolist())) < 2:
        from app.modules.intelligence.exceptions import InsufficientTrainingDataException
        raise InsufficientTrainingDataException(
            "Training data has only one class (all pass or all at-risk). Need both outcomes."
        )

    logreg = Pipeline([
        ("scaler", StandardScaler()),
        ("clf", LogisticRegression(max_iter=1000, class_weight="balanced")),
    ])
    rf = RandomForestClassifier(
        n_estimators=80,
        max_depth=6,
        min_samples_leaf=2,
        class_weight="balanced",
        random_state=42,
    )

    models = {"logreg": logreg, "rf": rf}
    metrics = {}

    # Keep CV folds stratified; cap by minority class so ROC-AUC does not produce NaN.
    minority = int(min(int(y.sum()), int(len(y) - y.sum())))
    cv = max(2, min(3, minority, len(labeled)))

    def _cv_metrics(model) -> dict:
        if minority < 2:
            return {"roc_auc_mean": None, "note": "cv_skipped_small_minority_class"}
        try:
            splitter = StratifiedKFold(n_splits=cv, shuffle=True, random_state=42)
            scores = cross_val_score(model, X, y, cv=splitter, scoring="roc_auc")
            return {
                "roc_auc_mean": _json_safe_float(scores.mean()),
                "roc_auc_std": _json_safe_float(scores.std()),
            }
        except Exception:
            return {"roc_auc_mean": None, "note": "cv_unavailable"}

    for name, model in models.items():
        model.fit(X, y)
        metrics[name] = _cv_metrics(model)

    try:
        from xgboost import XGBClassifier
        # scale_pos_weight for imbalance
        pos = max(1, int(y.sum()))
        neg = max(1, int(len(y) - y.sum()))
        xgb_model = XGBClassifier(
            n_estimators=80,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            scale_pos_weight=neg / pos,
            eval_metric="logloss",
            random_state=42,
        )
        xgb_model.fit(X, y)
        models["xgb"] = xgb_model
        metrics["xgb"] = _cv_metrics(xgb_model)
    except ImportError:
        metrics["xgb"] = {"error": "xgboost_not_installed"}

    # Feature importance from RF when available
    importances = {}
    if "rf" in models:
        rf_clf = models["rf"]
        for k, v in zip(FEATURE_KEYS, rf_clf.feature_importances_.tolist()):
            safe = _json_safe_float(v)
            importances[k] = round(safe, 4) if safe is not None else 0.0

    bundle = {
        "models": models,
        "feature_keys": FEATURE_KEYS,
        "model_version": "ensemble-v1",
        "trained_samples": len(labeled),
        "metrics": metrics,
        "feature_importances": importances,
    }
    save_bundle(bundle)
    return {
        "model_version": bundle["model_version"],
        "trained_samples": len(labeled),
        "metrics": metrics,
        "feature_importances": importances,
        "models_trained": list(models.keys()),
    }


def _predict_proba(model, X_row) -> float:
    import numpy as np
    X = np.array([X_row], dtype=float)
    if hasattr(model, "predict_proba"):
        proba = model.predict_proba(X)[0]
        # class 1 = at-risk
        classes = list(getattr(model, "classes_", [0, 1]))
        if hasattr(model, "named_steps"):
            classes = list(model.named_steps["clf"].classes_)
        if 1 in classes:
            return float(proba[list(classes).index(1)])
        return float(proba[-1])
    pred = model.predict(X)[0]
    return float(pred)


def predict_with_ml(feature_row: dict) -> Optional[dict]:
    bundle = load_bundle()
    if not bundle:
        return None

    models = bundle.get("models") or {}
    if not models:
        return None

    vec = feature_row.get("feature_vector") or []
    if len(vec) != len(FEATURE_KEYS):
        return None

    scores = {}
    for name, model in models.items():
        try:
            scores[name] = _predict_proba(model, vec)
        except Exception:
            continue

    if not scores:
        return None

    # Ensemble average of available models
    risk_score = sum(scores.values()) / len(scores)
    risk_score = max(0.0, min(1.0, round(risk_score, 3)))

    importances = bundle.get("feature_importances") or {}
    features = feature_row.get("features") or {}
    top_factors = []
    for key, imp in sorted(importances.items(), key=lambda x: x[1], reverse=True):
        miss_key = f"missing_{key.replace('_pct', '')}"
        if key.endswith("_pct") and float(features.get(miss_key) or 0) >= 1.0:
            continue
        if key == "attendance_pct" and float(features.get("missing_attendance") or 0) >= 1.0:
            continue
        top_factors.append({
            "factor": key,
            "detail": f"{key}={features.get(key)}",
            "weight": imp,
        })
        if len(top_factors) >= 5:
            break

    return {
        "risk_score": risk_score,
        "risk_level": risk_level_from_score(risk_score),
        "model_version": bundle.get("model_version") or "ensemble-v1",
        "model_scores": {k: round(v, 3) for k, v in scores.items()},
        "explanation": {
            "source": "ml_based",
            "top_factors": top_factors,
            "model_scores": {k: round(v, 3) for k, v in scores.items()},
        },
    }
