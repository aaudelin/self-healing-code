from unittest.mock import patch

from fastapi.testclient import TestClient

from src.main import app
from src.schemas import AnalysisReport

client = TestClient(app)


SAMPLE_REQUEST = {
    "logs": [
        {
            "timestamp": "2026-04-21T10:00:00Z",
            "level": "error",
            "message": "Cannot read property 'name' of null",
            "stack": "at /api/users/[id].ts:12",
        }
    ],
    "repository": {
        "structure": "src/api/users/[id].ts",
        "files": [
            {
                "path": "src/api/users/[id].ts",
                "content": "const user = await prisma.user.findUnique(...)",
            }
        ],
    },
    "schema": {"tables": []},
}


def test_analyze_requires_api_key() -> None:
    with patch("src.main.settings") as mock_settings:
        mock_settings.anthropic_api_key = None
        response = client.post("/runs/analyze", json=SAMPLE_REQUEST)
    assert response.status_code == 503


def test_analyze_returns_structured_report() -> None:
    fake_report = AnalysisReport(
        errorType="TypeError",
        severity="high",
        summary="Null access on user",
        rootCause="Missing null check after findUnique",
        affectedFiles=["src/api/users/[id].ts"],
        suggestedFix="Add `if (!user) return 404;` before dereferencing.",
        confidence=0.95,
    )

    async def _fake_run_analysis(_request):
        return fake_report

    with (
        patch("src.main.settings") as mock_settings,
        patch("src.main.run_analysis", side_effect=_fake_run_analysis),
    ):
        mock_settings.anthropic_api_key = "sk-test"
        response = client.post("/runs/analyze", json=SAMPLE_REQUEST)

    assert response.status_code == 200
    body = response.json()
    assert body["errorType"] == "TypeError"
    assert body["severity"] == "high"
    assert body["affectedFiles"] == ["src/api/users/[id].ts"]
    assert 0 <= body["confidence"] <= 1
