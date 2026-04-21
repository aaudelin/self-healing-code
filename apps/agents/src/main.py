from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

from src.agents.analysis import run_analysis
from src.config import settings
from src.schemas import AnalysisReport, AnalyzeRequest

app = FastAPI(title="AIOps Agents", version="0.0.0")


class HealthResponse(BaseModel):
    status: str
    service: str


@app.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    return HealthResponse(status="ok", service="agents")


@app.post("/runs/analyze", response_model=AnalysisReport, response_model_by_alias=True)
async def analyze(request: AnalyzeRequest) -> AnalysisReport:
    if not settings.anthropic_api_key:
        raise HTTPException(
            status_code=503,
            detail="ANTHROPIC_API_KEY not configured on agents service",
        )
    try:
        return await run_analysis(request)
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Analysis failed: {exc}") from exc
