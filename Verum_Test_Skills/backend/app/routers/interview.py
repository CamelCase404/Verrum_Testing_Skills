from __future__ import annotations

import ast
import json
import re
import uuid

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..gigachat_client import ask_text
from ..interview_store import create, get, save
from ..prompts import STAGE_DESCRIPTIONS, SYSTEM_INTERVIEWER, SYSTEM_REPORT
from ..schemas import (
    AnswerRequest,
    AnswerResponse,
    ReportResponse,
    StageScore,
    StartInterviewRequest,
    StartInterviewResponse,
    Turn,
)

router = APIRouter(prefix="/api/interview", tags=["interview"])

STAGE_NAMES = {0: "Архитектура", 1: "Code Review", 2: "Изменение требований"}
MIN_ANSWER_LENGTH = 15
MAX_SECONDS_PER_ANSWER = 180

STACK_NAMES = {
    "mobile-ios": "iOS (Swift / Objective-C)",
    "mobile-android": "Android (Kotlin / Java)",
    "frontend": "Frontend (React, Vue, Angular)",
    "backend": "Backend (Python, Go, Node.js, C#)",
    "gamedev": "GameDev (Unity, Unreal)",
    "devops": "DevOps / SRE",
    "data": "Data Science / ML",
}


def _is_trash_answer(text: str, seconds_spent: int) -> tuple[bool, str | None]:
    if seconds_spent > MAX_SECONDS_PER_ANSWER:
        return True, "Превышено время на ответ."
    stripped = text.strip()
    if len(stripped) < MIN_ANSWER_LENGTH:
        return True, "Слишком короткий ответ."
    words = stripped.split()
    if len(words) < (len(stripped) * 0.1) and len(stripped) > 20:
        return True, "Ответ выглядит как бессвязный набор слов."
    unique_chars = set(re.sub(r"\s", "", stripped.lower()))
    if len(unique_chars) < 5 and len(stripped) > 5:
        return True, "Ответ не содержит смысла."
    return False, None


class _AIEval(BaseModel):
    score: int
    feedback: str
    next_question: str


def _evaluate_and_generate(
    stage: int, level: str, stack: str, lang: str, history: list, seed: str = ""
) -> _AIEval:
    stack_human = STACK_NAMES.get(stack, stack)
    user = (
        f"Уровень: {level}. Стек: {stack_human}. Язык: {lang}.\n"
        f"Стадия: {stage}. {STAGE_DESCRIPTIONS[stage]}\n"
        f"История:\n"
        + "\n".join(f"- {t.role}: {t.content}" for t in history[-6:])
        + "\n\n"
    )
    if seed:
        user += f"Сгенерируй НОВЫЙ вопрос (учитывай seed: {seed}).\n"

    if stage == 2:
        user += "Придумай жесткое ограничение и спроси, как кандидат изменит решение. Верни JSON: {score: int, feedback: str, next_question: str}."
    else:
        user += (
            "Оцени ответ (0-4). Если бред — ставь 0. "
            f"ЗАПРЕЩЕНО задавать вопросы не по стеку {stack_human}, языку {lang} и уровню {level}. "
            "Верни JSON: {score: int, feedback: str, next_question: str}."
        )

    raw = ask_text(SYSTEM_INTERVIEWER, user).strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    try:
        return _AIEval.model_validate(json.loads(raw.strip()))
    except:
        return _AIEval.model_validate(ast.literal_eval(raw.strip()))


def _generate_code_review_task(level: str, stack: str, lang: str) -> tuple[str, str]:
    stack_human = STACK_NAMES.get(stack, stack)
    prompt = (
        f"Ты проводишь Code Review для {level} на позицию {stack_human} (язык: {lang}).\n"
        f"Сгенерируй фрагмент кода на {lang} с ошибками (уязвимости, плохая архитектура), соответствующий уровню сложности {level}.\n"
        'Верни ответ СТРОГО в JSON: {"question": "вопрос", "code_snippet": "код"}. Экранируй кавычки!'
    )
    raw = ask_text(SYSTEM_INTERVIEWER, prompt).strip()
    try:
        if raw.startswith("```json"):
            raw = raw[7:]
        if raw.startswith("```"):
            raw = raw[3:]
        if raw.endswith("```"):
            raw = raw[:-3]
        data = json.loads(raw.strip())
        return data["question"], data["code_snippet"]
    except Exception:
        return "Вот код. Найди проблемы.", "// Ошибка генерации кода"


@router.post("/start", response_model=StartInterviewResponse)
def start(req: StartInterviewRequest) -> StartInterviewResponse:
    primary_lang = req.language_ids[0] if req.language_ids else "general"
    stack_human = STACK_NAMES.get(req.stack_id, req.stack_id)
    it = create(req.level, req.stack_id, primary_lang)

    seed = str(uuid.uuid4())[:8]
    q = ask_text(
        SYSTEM_INTERVIEWER,
        f"Уровень: {req.level}. Стек: {stack_human}. Язык: {primary_lang}. Seed: {seed}.\n"
        f"Задай первый вопрос для этапа 'Архитектура', строго соответствующий уровню {req.level}. Верни ТОЛЬКО текст.",
    ).strip(' "\n')

    it.turns.append(Turn(role="assistant", content=q, seconds_spent=0))
    save(it)
    return StartInterviewResponse(
        interview_id=it.id, stage=0, stage_name=STAGE_NAMES[0], question=q
    )


@router.post("/answer", response_model=AnswerResponse)
def answer(req: AnswerRequest) -> AnswerResponse:
    it = get(req.interview_id)
    if not it:
        raise HTTPException(404, "interview not found")

    if req.answer == "___TAB_SWITCH_FAIL___":
        it.finished = True
        it.rejected = True
        it.reject_reason = "Выход из окна."
        save(it)
        return AnswerResponse(
            stage=it.stage,
            stage_name=STAGE_NAMES.get(it.stage, ""),
            finished=True,
            rejected=True,
            reject_reason=it.reject_reason,
        )

    is_skip = req.answer == "___SKIP___"
    if is_skip:
        req.answer = "Кандидат пропустил вопрос."
    else:
        is_trash, reason = _is_trash_answer(req.answer, req.seconds_spent)
        if is_trash:
            it.finished = True
            it.rejected = True
            it.reject_reason = reason
            save(it)
            return AnswerResponse(
                stage=it.stage,
                stage_name=STAGE_NAMES.get(it.stage, ""),
                finished=True,
                rejected=True,
                reject_reason=reason,
            )

    # Сохраняем ответ ВМЕСТЕ СО ВРЕМЕНЕМ
    it.turns.append(
        Turn(role="user", content=req.answer, seconds_spent=req.seconds_spent)
    )

    try:
        evaluation = _evaluate_and_generate(
            it.stage, it.level, it.stack_id, it.language_id, it.turns
        )
        if is_skip:
            evaluation.score = 0
    except Exception:
        evaluation = _AIEval(
            score=0 if is_skip else 2,
            feedback="Ошибка",
            next_question="Расскажите подробнее.",
        )
        # Жёсткий выброс только если это НЕ пропуск вопроса
        if not is_skip and evaluation.score <= 1:
            it.finished = True
            it.rejected = True
            it.reject_reason = f"Кандидат не справился с вопросом. Оценка ИИ: {evaluation.score}/4. {evaluation.feedback}"
            save(it)
            return AnswerResponse(
                stage=it.stage,
                stage_name=STAGE_NAMES.get(it.stage, ""),
                finished=True,
                rejected=True,
                reject_reason=it.reject_reason,
            )

    answers_on_stage = sum(1 for t in it.turns if t.role == "user")
    if answers_on_stage >= 2:
        it.stage += 1
        if it.stage > 2:
            it.finished = True
            save(it)
            return AnswerResponse(stage=2, stage_name=STAGE_NAMES[2], finished=True)

    if it.stage == 1:
        question, code = _generate_code_review_task(
            it.level, it.stack_id, it.language_id
        )
        it.turns.append(
            Turn(
                role="assistant",
                content=question + "\n\nКод:\n" + code,
                seconds_spent=0,
            )
        )
        save(it)
        return AnswerResponse(
            stage=it.stage,
            stage_name=STAGE_NAMES[it.stage],
            question=question,
            code_snippet=code,
        )

    q = evaluation.next_question
    it.turns.append(Turn(role="assistant", content=q, seconds_spent=0))
    save(it)
    return AnswerResponse(stage=it.stage, stage_name=STAGE_NAMES[it.stage], question=q)


class _Report(BaseModel):
    summary: str
    stages: list[StageScore]
    strengths: list[str]
    gaps: list[str]
    recommendation: str
    competency_architecture: int | None = None
    competency_code_review: int | None = None
    competency_prompting: int | None = None
    competency_ai_usage: int | None = None
    competency_soft_skills: int | None = None
    average_time_seconds: int | None = None
    time_efficiency_score: int | None = None
    final_grade: str | None = None
    average_score: float | None = None


def _parse_report_json(content: str) -> dict:
    content = content.strip()
    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]
    s, e = content.find("{"), content.rfind("}")
    if s != -1 and e != -1 and e > s:
        content = content[s : e + 1]
    try:
        return json.loads(content)
    except:
        pass
    try:
        return json.loads(content.replace("'", '"'))
    except:
        pass
    try:
        return ast.literal_eval(content)
    except:
        pass
    return {}


def _normalize_report_data(data: dict) -> dict:
    raw_stages = data.get("stages", [])
    if isinstance(raw_stages, dict):
        raw_stages = list(raw_stages.values())
    normalized_stages = []
    for idx, st in enumerate(raw_stages):
        if not isinstance(st, dict):
            continue
        score_val = st.get("score", st.get("rating", 0))
        try:
            score = int(score_val)
        except:
            score = 0
        stage_name = st.get("stage_name", st.get("name", ""))
        if not stage_name or len(stage_name) > 30:
            stage_name = f"Этап {idx + 1}"
        normalized_stages.append(
            {
                "stage": idx + 1,
                "stage_name": stage_name,
                "score": max(0, min(4, score)),
                "evidence": (
                    [str(x) for x in st.get("evidence", [])]
                    if isinstance(st.get("evidence"), list)
                    else []
                ),
                "gaps": (
                    [str(x) for x in st.get("gaps", [])]
                    if isinstance(st.get("gaps"), list)
                    else []
                ),
            }
        )
    raw_gaps = data.get("gaps", [])
    normalized_gaps = (
        [
            str(g.get("description", str(g))) if isinstance(g, dict) else str(g)
            for g in raw_gaps
        ]
        if isinstance(raw_gaps, list)
        else []
    )

    return {
        "summary": str(data.get("summary", "Отчёт сформирован.")),
        "stages": normalized_stages,
        "strengths": (
            [str(x) for x in data.get("strengths", [])]
            if isinstance(data.get("strengths"), list)
            else []
        ),
        "gaps": normalized_gaps,
        "recommendation": str(
            data.get("recommendation", "insufficient_evidence")
        ).lower(),
        "competency_architecture": data.get("competency_architecture"),
        "competency_code_review": data.get("competency_code_review"),
        "competency_prompting": data.get("competency_prompting"),
        "competency_ai_usage": data.get("competency_ai_usage"),
        "competency_soft_skills": data.get("competency_soft_skills"),
        "average_time_seconds": data.get("average_time_seconds"),
        "time_efficiency_score": data.get("time_efficiency_score"),
        "final_grade": data.get("final_grade"),
        "average_score": data.get("average_score"),
    }


@router.get("/{interview_id}/report", response_model=ReportResponse)
def report(interview_id: str) -> ReportResponse:
    it = get(interview_id)
    if not it:
        raise HTTPException(404, "interview not found")
    if not it.finished:
        raise HTTPException(409, "interview is not finished")

    if it.rejected:
        return ReportResponse(
            interview_id=it.id,
            level=it.level,
            stack_id=it.stack_id,
            language_id=it.language_id,
            summary="Интервью было прервано.",
            stages=[],
            strengths=[],
            gaps=[it.reject_reason or "Нарушение"],
            recommendation="no_hire",
            rejected=True,
            reject_reason=it.reject_reason,
        )

    # Формируем транскрипт с указанием времени
    transcript_lines = []
    for t in it.turns:
        if t.role == "user":
            transcript_lines.append(
                f"{t.role} (потратил {t.seconds_spent} сек): {t.content}"
            )
        else:
            transcript_lines.append(f"{t.role}: {t.content}")
    transcript = "\n".join(transcript_lines)

    user = f"Уровень: {it.level}. Стек: {it.stack_id}. Язык: {it.language_id}.\nТранскрипт:\n{transcript}\n\nСформируй отчёт по схеме, оцени время ответов."

    try:
        raw = ask_text(SYSTEM_REPORT, user)
        normalized = _normalize_report_data(_parse_report_json(raw))
        parsed = _Report.model_validate(normalized)
        rec = (
            parsed.recommendation
            if parsed.recommendation in ("hire", "no_hire", "insufficient_evidence")
            else "insufficient_evidence"
        )
        grade = (
            parsed.final_grade
            if parsed.final_grade in ("Junior", "Middle", "Senior", "Reject")
            else "Reject"
        )

        return ReportResponse(
            interview_id=it.id,
            level=it.level,
            stack_id=it.stack_id,
            language_id=it.language_id,
            summary=parsed.summary,
            stages=parsed.stages,
            strengths=parsed.strengths,
            gaps=parsed.gaps,
            recommendation=rec,
            competency_architecture=parsed.competency_architecture,
            competency_code_review=parsed.competency_code_review,
            competency_prompting=parsed.competency_prompting,
            competency_ai_usage=parsed.competency_ai_usage,
            competency_soft_skills=parsed.competency_soft_skills,
            average_time_seconds=parsed.average_time_seconds,
            time_efficiency_score=parsed.time_efficiency_score,
            final_grade=grade,
            average_score=parsed.average_score,
            rejected=False,
            reject_reason=None,
        )
    except Exception as e:
        return ReportResponse(
            interview_id=it.id,
            level=it.level,
            stack_id=it.stack_id,
            language_id=it.language_id,
            summary="Ошибка генерации отчёта.",
            stages=[],
            strengths=[],
            gaps=[str(e)],
            recommendation="insufficient_evidence",
            rejected=False,
            reject_reason=None,
        )
