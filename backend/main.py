from fastapi import FastAPI

app = FastAPI(title="Student Academics API")

@app.get("/")
async def root():
    return {"message": "Welcome to Student Performance & Academic Analytics API"}
