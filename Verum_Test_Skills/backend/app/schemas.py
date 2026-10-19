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
    language_ids: list[str]  # Принимаем список языков


class Turn(BaseModel):
    role: Literal["assistant", "user"]
    content: str


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
    code_review_score: Optional[int] = None
    prompt_skill_score: Optional[int] = None
    rejected: bool = False
    reject_reason: Optional[str] = None
