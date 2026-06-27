from fastapi import Request, FastAPI
from fastapi.responses import JSONResponse
from app.core.exceptions import AppException
import traceback

def add_exception_handlers(app: FastAPI):
    @app.exception_handler(AppException)
    async def app_exception_handler(request: Request, exc: AppException):
        return JSONResponse(
            status_code=exc.status_code,
            content={"detail": exc.message, "status": "error"}
        )

    @app.exception_handler(Exception)
    async def general_exception_handler(request: Request, exc: Exception):
        traceback.print_exc()
        return JSONResponse(
            status_code=500,
            content={"detail": str(exc), "status": "error"}
        )
