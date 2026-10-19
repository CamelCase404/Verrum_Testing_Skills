from __future__ import annotations

import ast
import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from ..gigachat_client import ask_text
from ..interview_store import create, get
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

MIN_ANSWER_LENGTH = 10
MAX_SECONDS_PER_ANSWER = 180

BAD_CODE_SAMPLES = {
    "csharp": 'public class UserService {\n  public string connStr = "Server=myServer;Database=myDb;User Id=sa;Password=12345;";\n  public string GetUser(int id) {\n    var conn = new SqlConnection(connStr);\n    var cmd = new SqlCommand("SELECT * FROM Users WHERE Id = " + id, conn);\n    conn.Open();\n    var reader = cmd.ExecuteReader();\n    return reader.GetString(0);\n  }\n}',
    "python": "def get_user(id):\n    conn = sqlite3.connect('db.sqlite')\n    cursor = conn.cursor()\n    cursor.execute(f\"SELECT * FROM users WHERE id = {id}\")\n    return cursor.fetchone()",
    "javascript": "function getUser(id) {\n  const query = `SELECT * FROM users WHERE id = ${id}`;\n  return db.query(query);\n}",
    "default": 'function getUser(id) {\n  const query = "SELECT * FROM users WHERE id = " + id;\n  return db.query(query);\n}',
}


def _is_trash_answer(text: str, seconds_spent: int) -> tuple[bool, str | None]:
    if seconds_spent > MAX_SECONDS_PER_ANSWER:
        return True, "Превышено время на ответ."
    stripped = text.strip()
    if len(stripped) < MIN_ANSWER_LENGTH:
        return True, "Слишком короткий ответ."
    unique_chars = set(re.sub(r"\s", "", stripped.lower()))
    if len(unique_chars) < 4 and len(stripped) > 5:
        return True, "Ответ не содержит осмысленного текста."
    return False, None


class _AIEval(BaseModel):
    score: int
    feedback: str
    next_question: str


def _evaluate_and_generate(
    stage: int, level: str, stack: str, lang: str, history: list[Turn]
) -> _AIEval:
    user = (
        f"Уровень: {level}. Стек: {stack}. Язык: {lang}.\n"
        f"Стадия {stage}: {STAGE_DESCRIPTIONS[stage]}\n"
        "История:\n"
        + "\n".join(f"- {t.role}: {t.content}" for t in history[-6:])
        + "\n\n"
    )

    # Строгая инструкция для ИИ
    if stage == 2:
        user += (
            "Придумай жесткое ограничение (например: 'Теперь сервер может обрабатывать только 10 RPS, "
            "а бюджет урезан в 10 раз'). Задай вопрос: как кандидат изменит свое решение в этих рамках. "
            "Верни JSON: {score: int, feedback: str, next_question: str}."
        )
    else:
        user += "Оцени последний ответ кандидата по шкале 0..4. Верни JSON: {score: int, feedback: str, next_question: str}."

    raw = ask_text(SYSTEM_INTERVIEWER, user)
    raw = raw.strip()
    if raw.startswith("```json"):
        raw = raw[7:]
    if raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]
    raw = raw.strip()

    try:
        data = json.loads(raw)
    except Exception:
        data = ast.literal_eval(raw)
    return _AIEval.model_validate(data)


@router.post("/start", response_model=StartInterviewResponse)
def start(req: StartInterviewRequest) -> StartInterviewResponse:
    primary_lang = req.language_ids[0] if req.language_ids else "general"
    it = create(req.level, req.stack_id, primary_lang)

    user_prompt = (
        f"Уровень: {req.level}. Стек: {req.stack_id}. Язык: {primary_lang}.\n"
        "Задай первый вопрос для этапа 'Архитектура' (Stage 0). "
        "Верни ТОЛЬКО текст вопроса."
    )
    q = ask_text(SYSTEM_INTERVIEWER, user_prompt).strip(' "\n')

    it.turns.append(Turn(role="assistant", content=q))
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
        it.reject_reason = "Нарушение правил: выход из активного окна."
        return AnswerResponse(
            stage=it.stage,
            stage_name=STAGE_NAMES.get(it.stage, ""),
            finished=True,
            rejected=True,
            reject_reason=it.reject_reason,
        )

    # Обработка кнопки "Пропустить"
    if req.answer == "___SKIP___":
        is_skip = True
        req.answer = "Кандидат пропустил вопрос."  # сохраняем в историю
    else:
        is_skip = False

    if not is_skip:
        is_trash, reason = _is_trash_answer(req.answer, req.seconds_spent)
        if is_trash:
            it.finished = True
            it.rejected = True
            it.reject_reason = reason
            return AnswerResponse(
                stage=it.stage,
                stage_name=STAGE_NAMES.get(it.stage, ""),
                finished=True,
                rejected=True,
                reject_reason=reason,
            )

    it.turns.append(Turn(role="user", content=req.answer))

    try:
        evaluation = _evaluate_and_generate(
            it.stage, it.level, it.stack_id, it.language_id, it.turns
        )
        if is_skip:
            evaluation.score = 0  # Жесткий штраф за пропуск
    except Exception as e:
        print(f"Ошибка оценки ИИ: {e}")
        evaluation = _AIEval(
            score=0 if is_skip else 2,
            feedback="Ошибка парсинга",
            next_question="Расскажите подробнее.",
        )

    answers_on_stage = sum(1 for t in it.turns if t.role == "user")
    if answers_on_stage >= 2:
        it.stage += 1
        if it.stage > 2:
            it.finished = True
            return AnswerResponse(stage=2, stage_name=STAGE_NAMES[2], finished=True)

    if it.stage == 1:
        bad_code = BAD_CODE_SAMPLES.get(it.language_id, BAD_CODE_SAMPLES["default"])
        q = "Вот код. Найди в нем проблемы безопасности и предложи исправления."
        it.turns.append(Turn(role="assistant", content=q + "\n\nКод:\n" + bad_code))
        return AnswerResponse(
            stage=it.stage,
            stage_name=STAGE_NAMES[it.stage],
            question=q,
            code_snippet=bad_code,
        )

    q = evaluation.next_question
    it.turns.append(Turn(role="assistant", content=q))
    return AnswerResponse(stage=it.stage, stage_name=STAGE_NAMES[it.stage], question=q)


class _Report(BaseModel):
    summary: str
    stages: list[StageScore]
    strengths: list[str]
    gaps: list[str]
    recommendation: str
    code_review_score: int | None = None
    prompt_skill_score: int | None = None


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

        # Умный поиск оценки (ИИ любит называть поле "score", но иногда суёт строку в "stage")
        score_val = st.get("score", st.get("rating", 0))
        try:
            score = int(score_val)
        except (ValueError, TypeError):
            # Если ИИ написал текст в поле score или stage, ставим 0
            score = 0

        # Умный поиск названия стадии
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
        "code_review_score": data.get("code_review_score"),
        "prompt_skill_score": data.get("prompt_skill_score"),
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
            code_review_score=None,
            prompt_skill_score=None,
            rejected=True,
            reject_reason=it.reject_reason,
        )

    transcript = "\n".join(f"{t.role}: {t.content}" for t in it.turns)
    user = f"Уровень: {it.level}. Стек: {it.stack_id}. Язык: {it.language_id}.\nТранскрипт:\n{transcript}\n\nСформируй отчёт."
    try:
        raw = ask_text(SYSTEM_REPORT, user)
        normalized = _normalize_report_data(_parse_report_json(raw))
        parsed = _Report.model_validate(normalized)
        rec = (
            parsed.recommendation
            if parsed.recommendation in ("hire", "no_hire", "insufficient_evidence")
            else "insufficient_evidence"
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
            code_review_score=parsed.code_review_score,
            prompt_skill_score=parsed.prompt_skill_score,
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
