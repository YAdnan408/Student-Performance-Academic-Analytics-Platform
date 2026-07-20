from app.core.exceptions import AppException


class IntelligenceException(AppException):
    def __init__(self, message: str = "Intelligence module error", status_code: int = 400):
        super().__init__(message, status_code=status_code)


class InsufficientTrainingDataException(IntelligenceException):
    def __init__(self, message: str = "Need at least 8 completed labeled enrollments to train ML models"):
        super().__init__(message, status_code=400)


class PredictionNotFoundException(IntelligenceException):
    def __init__(self):
        super().__init__("Prediction not found", status_code=404)
