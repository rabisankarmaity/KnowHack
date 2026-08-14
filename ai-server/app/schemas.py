"""Request/response contracts. Additive-only: new fields must be optional so the
Node backend never breaks when the AI service is upgraded."""
from typing import Any, Literal

from pydantic import BaseModel, Field


class SourceFile(BaseModel):
    url: str
    name: str | None = None
    mime_type: str | None = Field(default=None, alias="mimeType")
    kind: Literal["pdf", "ppt", "doc", "auto"] = "auto"

    model_config = {"populate_by_name": True}


class SummarizeRequest(BaseModel):
    project_id: str = Field(alias="projectId")
    title: str | None = None
    text: str | None = None
    files: list[SourceFile] = []
    index: bool = True
    # Section-aware content: { overview|problem|research|architecture|...: text }.
    sections: dict[str, str] | None = None
    # Optional metadata recorded next to the embeddings (hackathon, domain,
    # technologies, university, year, visibility). Informational — authorization
    # is enforced by the Node backend.
    metadata: dict[str, Any] | None = Field(default=None, alias="metadata")

    model_config = {"populate_by_name": True}


class CaseFile(BaseModel):
    problem: str | None = None
    target_users: str | None = None
    research: str | None = None
    solution: str | None = None
    innovation: str | None = None
    architecture: str | None = None
    challenges: list[str] = []
    lessons: list[str] = []
    future_scope: list[str] = []
    team: str | None = None
    existing_solutions: str | None = None
    features: str | None = None
    database: str | None = None
    api_integrations: str | None = None
    ui_ux: str | None = None
    development_journey: str | None = None
    judge_feedback: str | None = None


class Metadata(BaseModel):
    keywords: list[str] = []
    sector: str | None = None
    difficulty: str | None = None
    project_type: str | None = None


class TechStack(BaseModel):
    languages: list[str] = []
    frameworks: list[str] = []
    databases: list[str] = []
    cloud: list[str] = []
    tools: list[str] = []


class SimilarProject(BaseModel):
    project_id: str
    title: str | None = None
    score: float


class SimilarityResult(BaseModel):
    """Enriched similar-project item produced by the Similar/Duplicate engine."""

    project_id: str
    title: str | None = None
    score: float
    similarity_score: float | None = None
    relationship: str | None = None
    signals: dict[str, float] = {}
    weights: dict[str, float] = {}
    explanation: str | None = None
    overlapping_sections: list[str] = []
    differences: list[str] = []
    recommendation: str | None = None
    risk: str | None = None
    human_review_required: bool | None = None


class SummarizeResponse(BaseModel):
    project_id: str
    summary: str
    highlights: list[str] = []
    case_file: CaseFile = CaseFile()
    metadata: Metadata = Metadata()
    tech_stack: TechStack = TechStack()
    sector: str | None = None
    embedding_ref: str | None = None
    similar_projects: list[SimilarityResult] = []
    model: str
    engine: Literal["llm", "fallback"]
    warnings: list[str] = []


class SimilarityRequest(BaseModel):
    project_id: str | None = Field(default=None, alias="projectId")
    text: str | None = None
    limit: int = 5
    visible_project_ids: list[str] = Field(default_factory=list, alias="visibleProjectIds")
    include_analysis: bool = True

    model_config = {"populate_by_name": True}


class SimilarityResponse(BaseModel):
    results: list[SimilarityResult]


class EmbeddingsRequest(BaseModel):
    inputs: list[str]


class EmbeddingsResponse(BaseModel):
    model: str
    dim: int
    embeddings: list[list[float]]


class IndexedProject(BaseModel):
    project_id: str
    title: str | None = None
    sector: str | None = None
    updated_at: str | None = None


class HealthLivenessResponse(BaseModel):
    """Cheap liveness probe — deliberately excludes the expensive checks."""

    status: Literal["ok", "error"]
    service: str
    environment: str


class HealthResponse(BaseModel):
    status: Literal["healthy", "degraded", "unavailable"]
    service: str
    environment: str
    checks: dict[str, Any]


# ---------------------------------------------------------------------------
# System 1 — Weakness / Mistake Detector.
# ---------------------------------------------------------------------------
class WeaknessAnalysisRequest(BaseModel):
    project_id: str = Field(alias="projectId")
    title: str | None = None
    # Section -> text. Any extra sections are tolerated (the detector reads the
    # relevant fields and reports "Not documented" elsewhere).
    case_file: dict[str, str] = Field(default_factory=dict, alias="caseFile")
    metadata: dict[str, Any] | None = None

    model_config = {"populate_by_name": True}


class WeaknessItem(BaseModel):
    category: str
    severity: str
    title: str
    evidence: str
    why_it_matters: str
    recommended_action: str
    priority: str


class WeaknessAnalysisResponse(BaseModel):
    project_id: str
    overall_score: int = Field(ge=0, le=100)
    severity: str
    summary: str
    strengths: list[str] = []
    weaknesses: list[WeaknessItem] = []
    missing_sections: list[str] = []
    scope_risks: list[str] = []
    technical_risks: list[str] = []
    security_risks: list[str] = []
    business_risks: list[str] = []
    quick_fixes: list[str] = []
    before_submission: list[str] = []
    model: str
    engine: Literal["llm", "fallback"]


# ---------------------------------------------------------------------------
# System 2 — Right-Way-of-Thinking Mentor (RAG-grounded).
# ---------------------------------------------------------------------------
class ThinkingMentorRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    project_id: str | None = Field(default=None, alias="projectId")
    # The sections of the project being asked about, so the mentor can ground on
    # the current project even when it is not indexed yet.
    project_context: dict[str, str] | None = Field(default=None, alias="projectContext")
    # Project ids the caller is allowed to see (authorization enforced by backend).
    visible_project_ids: list[str] = Field(default_factory=list, alias="visibleProjectIds")

    model_config = {"populate_by_name": True}


class EvidenceItem(BaseModel):
    project_id: str
    title: str | None = None
    section: str | None = None
    text: str | None = None


class AlternativeItem(BaseModel):
    option: str
    trade_off: str = ""


class ThinkingMentorResponse(BaseModel):
    project_id: str | None = None
    question: str
    understanding: str
    decision: str
    considerations: list[str] = []
    evidence: list[EvidenceItem] = []
    alternatives: list[AlternativeItem] = []
    tradeoffs: list[str] = []
    recommendation: str
    next_actions: list[str] = []
    follow_up_question: str = ""
    response: str
    grounded: bool
    sources: list[EvidenceItem] = []
    model: str
    engine: Literal["llm", "fallback"]