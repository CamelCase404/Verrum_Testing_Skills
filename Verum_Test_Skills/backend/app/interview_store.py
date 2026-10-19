from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from .schemas import Level, Turn


@dataclass
class Interview:
    id: str
    level: Level
    stack_id: str
    language_id: str  # Храним строку (первый язык) для отчетов
    stage: int = 0
    finished: bool = False
    rejected: bool = False
    reject_reason: Optional[str] = None
    turns: list[Turn] = field(default_factory=list)


STORE: dict[str, Interview] = {}


def create(level: Level, stack_id: str, language_id: str) -> Interview:
    it = Interview(
        id=str(uuid.uuid4()), level=level, stack_id=stack_id, language_id=language_id
    )
    STORE[it.id] = it
    return it


def get(interview_id: str) -> Optional[Interview]:
    return STORE.get(interview_id)
