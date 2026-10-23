from __future__ import annotations

from enum import Enum
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
    score: int = Field(ge=0, le=100)
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
    competency_code_understanding: Optional[int] = None
    competency_prompting: Optional[int] = None
    competency_adaptability: Optional[int] = None
    competency_soft_skills: Optional[int] = None

    total_score_100: Optional[int] = None
    final_grade: Optional[Literal["Junior", "Middle", "Senior", "Reject"]] = None

    rejected: bool = False
    reject_reason: Optional[str] = None


class UserRole(str, Enum):
    DEVELOPER = "developer"
    COMPANY = "company"


class UserRegister(BaseModel):
    email: str
    password: str
    role: UserRole
    full_name: str


class UserLogin(BaseModel):
    email: str
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str


class UserProfile(BaseModel):
    id: int
    email: str
    role: UserRole
    full_name: str
    skills: dict | None = None  # ← было list[dict], а skills_data — это dict
    company_name: str | None = None
    website: str | None = None
