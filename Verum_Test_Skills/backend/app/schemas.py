from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, Field

Level = Literal["Junior", "Middle", "Senior"]


class CatalogOption(BaseModel):
    id: str
    name: str
    icon: str
    description: str


class StackOption(CatalogOption):
    languages: list[CatalogOption]


class CatalogResponse(BaseModel):
    levels: list[CatalogOption]
    stacks: list[StackOption]


class StartInterviewRequest(BaseModel):
    level: Level
    stack_id: str
    language_ids: list[str]


class Turn(BaseModel):
    role: Literal["assistant", "user"]
    content: str
    seconds_spent: int = 0


class StartInterviewResponse(BaseModel):
    interview_id: str
    stage: int
    stage_name: str
    question: str
    code_snippet: Optional[str] = None


class AnswerRequest(BaseModel):
    interview_id: str
    answer: str
    seconds_spent: int = 0


class AnswerResponse(BaseModel):
    stage: int
    stage_name: str
    question: Optional[str] = None
    code_snippet: Optional[str] = None
    finished: bool = False
    rejected: bool = False
    reject_reason: Optional[str] = None


class StageScore(BaseModel):
    stage: int
    stage_name: str
    score: int = Field(ge=0, le=4)
    evidence: list[str]
    gaps: list[str]


class ReportResponse(BaseModel):
    interview_id: str
    level: Level
    stack_id: str
    language_id: str
    summary: str
    stages: list[StageScore]
    strengths: list[str]
    gaps: list[str]
    recommendation: Literal["hire", "no_hire", "insufficient_evidence"]

    competency_architecture: Optional[int] = None
    competency_code_review: Optional[int] = None
    competency_prompting: Optional[int] = None
    competency_ai_usage: Optional[int] = None
    competency_soft_skills: Optional[int] = None

    # Новые поля для времени
    average_time_seconds: Optional[int] = None
    time_efficiency_score: Optional[int] = None  # 0-4

    final_grade: Optional[Literal["Junior", "Middle", "Senior", "Reject"]] = None
    average_score: Optional[float] = None

    rejected: bool = False
    reject_reason: Optional[str] = None
