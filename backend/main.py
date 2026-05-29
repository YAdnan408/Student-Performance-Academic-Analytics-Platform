from fastapi import FastAPI
from app.core.error_handlers import add_exception_handlers

app = FastAPI(title="Student Academics API")

# Add global exception handlers
add_exception_handlers(app)

@app.get("/")
async def root():
    return {"message": "Welcome to Student Performance & Academic Analytics API"}
