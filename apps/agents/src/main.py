from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="AIOps Agents", version="0.0.0")


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="agents")
