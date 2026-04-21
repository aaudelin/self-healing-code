"""Pydantic schemas mirroring packages/shared/src/types/index.ts.

Kept deliberately 1:1 with the TS definitions so the Nest side can serialize
the same payloads without translation. Field names stay camelCase to match
the existing Node-side contract; the HTTP boundary is the source of truth.
"""

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class _CamelModel(BaseModel):
    model_config = ConfigDict(populate_by_name=True)


Severity = Literal["low", "medium", "high", "critical"]
LogLevel = Literal["error", "warn", "info"]


class LogEntry(_CamelModel):
    timestamp: str
    level: LogLevel
    message: str
    source: str | None = None
    stack: str | None = None
    metadata: dict | None = None


class ColumnSchema(_CamelModel):
    name: str
    type: str
    nullable: bool
    default_value: str | None = Field(default=None, alias="defaultValue")
    is_primary_key: bool | None = Field(default=None, alias="isPrimaryKey")
    is_foreign_key: bool | None = Field(default=None, alias="isForeignKey")
    references: dict | None = None


class IndexSchema(_CamelModel):
    name: str
    columns: list[str]
    unique: bool


class TableSchema(_CamelModel):
    name: str
    columns: list[ColumnSchema]
    indexes: list[IndexSchema] | None = None


class DatabaseSchema(_CamelModel):
    tables: list[TableSchema]


class RepositoryFile(_CamelModel):
    path: str
    content: str


class RepositoryContext(_CamelModel):
    files: list[RepositoryFile]
    structure: str


class AnalysisReport(_CamelModel):
    error_type: str = Field(alias="errorType")
    severity: Severity
    summary: str
    root_cause: str = Field(alias="rootCause")
    affected_files: list[str] = Field(alias="affectedFiles")
    suggested_fix: str = Field(alias="suggestedFix")
    confidence: float = Field(ge=0.0, le=1.0)


class AnalyzeRequest(_CamelModel):
    logs: list[LogEntry]
    repository: RepositoryContext
    schema_: DatabaseSchema = Field(alias="schema")
