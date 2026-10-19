from dataclasses import dataclass, field
from datetime import datetime
from typing import Literal

Stage = int
Level = Literal["Junior", "Middle", "Senior"]


@dataclass
class Turn:
    role: Literal["assistant", "user"]
    content: str
    at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class Interview:
    id: str
    stack: str
    language: str
    level: Level
    stage: Stage = 0
    status: Literal["in_progress", "review_required", "finalized"] = "in_progress"
    history: list[Turn] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)


INTERVIEWS: dict[str, Interview] = {}


def get(interview_id: str) -> Interview | None:
    return INTERVIEWS.get(interview_id)


def put(i: Interview) -> None:
    INTERVIEWS[i.id] = i
