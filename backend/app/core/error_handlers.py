from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from app.core.exceptions import AppException

def add_exception_handlers(app: FastAPI):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "status": "error"}
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        # In production, log this error
        return JSONResponse(
            status_code=500,
            content={"detail": "Internal server error", "status": "error"}
        )
