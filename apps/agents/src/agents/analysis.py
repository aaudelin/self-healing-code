"""Analysis agent: LangGraph single-node graph wrapping ChatAnthropic.

Replaces apps/api/src/agents/analysis-agent.service.ts. Instead of prompting
for JSON and regex-parsing the response, this uses Anthropic tool-use via
LangChain's structured output to guarantee the shape matches AnalysisReport.
"""

from typing import TypedDict

from langchain_anthropic import ChatAnthropic
from langchain_core.prompts import ChatPromptTemplate
from langgraph.graph import END, START, StateGraph

from src.config import settings
from src.schemas import AnalysisReport, AnalyzeRequest


class AnalysisState(TypedDict):
    request: AnalyzeRequest
    report: AnalysisReport | None


SYSTEM_PROMPT = (
    "You are an expert software engineer analyzing production errors "
    "to identify root causes and suggest fixes."
)

USER_PROMPT = """## Error Logs
{logs}

## Repository Structure
{structure}

## Relevant Source Files
{files}

## Database Schema
{schema}

## Task
Analyze the logs and emit a structured AnalysisReport. Fill every field. Keep
`suggestedFix` actionable with concrete code snippets when relevant. Set
`confidence` honestly — low when the logs lack detail, high when the root
cause is unambiguous.
"""


def _render_logs(req: AnalyzeRequest) -> str:
    return "\n\n".join(
        f"[{log.timestamp}] {log.level.upper()}: {log.message}"
        + (f"\n{log.stack}" if log.stack else "")
        for log in req.logs
    )


def _render_files(req: AnalyzeRequest) -> str:
    return "\n\n".join(
        f"### {f.path}\n```typescript\n{f.content}\n```" for f in req.repository.files
    )


def _build_llm() -> ChatAnthropic:
    return ChatAnthropic(
        model_name=settings.anthropic_model,
        api_key=settings.anthropic_api_key,
        max_tokens_to_sample=4096,
        timeout=60,
        stop=None,
    )


async def _analyze_node(state: AnalysisState) -> AnalysisState:
    llm = _build_llm().with_structured_output(AnalysisReport)
    prompt = ChatPromptTemplate.from_messages(
        [("system", SYSTEM_PROMPT), ("user", USER_PROMPT)]
    )
    req = state["request"]
    chain = prompt | llm
    result = await chain.ainvoke(
        {
            "logs": _render_logs(req),
            "structure": req.repository.structure,
            "files": _render_files(req),
            "schema": req.schema_.model_dump_json(by_alias=True, indent=2),
        }
    )
    return {"request": req, "report": result}  # type: ignore[typeddict-item]


def build_graph():
    graph = StateGraph(AnalysisState)
    graph.add_node("analyze", _analyze_node)
    graph.add_edge(START, "analyze")
    graph.add_edge("analyze", END)
    return graph.compile()


_graph = None


def get_graph():
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


async def run_analysis(request: AnalyzeRequest) -> AnalysisReport:
    result = await get_graph().ainvoke({"request": request, "report": None})
    report = result["report"]
    if report is None:
        raise RuntimeError("Analysis graph returned no report")
    return report
