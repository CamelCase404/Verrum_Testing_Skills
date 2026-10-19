from __future__ import annotations

import uuid
from dataclasses import dataclass, field
from typing import Optional

from sqlalchemy import Boolean, Column, ForeignKey, Integer, String, Text, create_engine
from sqlalchemy.orm import declarative_base, relationship, sessionmaker

from .schemas import Level, Turn

DATABASE_URL = "sqlite:///./database.db"
engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class DBInterview(Base):
    __tablename__ = "interviews"
    id = Column(String, primary_key=True, index=True)
    level = Column(String)
    stack_id = Column(String)
    language_id = Column(String)
    stage = Column(Integer, default=0)
    finished = Column(Boolean, default=False)
    rejected = Column(Boolean, default=False)
    reject_reason = Column(String, nullable=True)
    turns = relationship(
        "DBTurn", back_populates="interview", cascade="all, delete-orphan"
    )


class DBTurn(Base):
    __tablename__ = "turns"
    id = Column(Integer, primary_key=True, autoincrement=True)
    interview_id = Column(String, ForeignKey("interviews.id"))
    role = Column(String)
    content = Column(Text)
    seconds_spent = Column(Integer, default=0)  # Сохраняем время
    interview = relationship("DBInterview", back_populates="turns")


Base.metadata.create_all(bind=engine)


@dataclass
class TurnData:
    role: str
    content: str
    seconds_spent: int = 0


@dataclass
class Interview:
    id: str
    level: Level
    stack_id: str
    language_id: str
    stage: int = 0
    finished: bool = False
    rejected: bool = False
    reject_reason: Optional[str] = None
    turns: list[TurnData] = field(default_factory=list)


def create(level: Level, stack_id: str, language_id: str) -> Interview:
    db = SessionLocal()
    new_it = DBInterview(
        id=str(uuid.uuid4()), level=level, stack_id=stack_id, language_id=language_id
    )
    db.add(new_it)
    db.commit()
    db.refresh(new_it)
    db.close()
    return get(new_it.id)


def get(interview_id: str) -> Optional[Interview]:
    db = SessionLocal()
    db_it = db.query(DBInterview).filter(DBInterview.id == interview_id).first()
    if not db_it:
        db.close()
        return None

    turns = [
        TurnData(role=t.role, content=t.content, seconds_spent=t.seconds_spent)
        for t in db_it.turns
    ]
    result = Interview(
        id=db_it.id,
        level=db_it.level,
        stack_id=db_it.stack_id,
        language_id=db_it.language_id,
        stage=db_it.stage,
        finished=db_it.finished,
        rejected=db_it.rejected,
        reject_reason=db_it.reject_reason,
        turns=turns,
    )
    db.close()
    return result


def save(interview: Interview):
    db = SessionLocal()
    db_it = db.query(DBInterview).filter(DBInterview.id == interview.id).first()
    if db_it:
        db_it.stage = interview.stage
        db_it.finished = interview.finished
        db_it.rejected = interview.rejected
        db_it.reject_reason = interview.reject_reason

        db.query(DBTurn).filter(DBTurn.interview_id == interview.id).delete()
        for t in interview.turns:
            db.add(
                DBTurn(
                    interview_id=interview.id,
                    role=t.role,
                    content=t.content,
                    seconds_spent=t.seconds_spent,
                )
            )

        db.commit()
    db.close()
