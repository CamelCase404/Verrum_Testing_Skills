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

STAGE_NAMES = {0: "Общие знания", 1: "Code Review", 2: "Нагрузка"}
MIN_ANSWER_LENGTH = 10
MAX_SECONDS_PER_ANSWER = 180
QUESTIONS_PER_STAGE = 5


def _is_trash_answer(text: str, seconds_spent: int) -> tuple[bool, str | None]:
    if seconds_spent > MAX_SECONDS_PER_ANSWER:
        return True, "Превышено время на ответ."
    stripped = text.strip()
    if len(stripped) < MIN_ANSWER_LENGTH:
        return True, "Слишком короткий ответ."
    return False, None


def _clean_text(raw: str) -> str:
    raw = raw.strip()
    raw = raw.replace("{{", "{").replace("}}", "}")
    if raw.startswith("```json"):
        raw = raw[7:]
    elif raw.startswith("```"):
        raw = raw[3:]
    if raw.endswith("```"):
        raw = raw[:-3]

    if raw.startswith("{"):
        try:
            data = json.loads(raw)
            raw = str(data.get("next_question", data.get("question", raw)))
        except:
            pass

    clean = re.sub(r'[{}"]', "", raw).strip()
    clean = re.sub(
        r"^(score|feedback|next_question)\s*:\s*", "", clean, flags=re.IGNORECASE
    ).strip()
    return clean


def _generate_pure_question(
    stage: int,
    level: str,
    stack: str,
    langs: str,
    past_questions: list[str],
    prev_code_context: str = "",
    prev_answer: str = "",
) -> str:
    prev_q_str = (
        "\n".join(f"- {q[:50]}..." for q in past_questions[-5:])
        if past_questions
        else "Нет"
    )
    stage_desc = STAGE_DESCRIPTIONS[stage].format(langs=langs)

    sys_prompt = SYSTEM_INTERVIEWER.format(level=level, langs=langs)

    prompt = (
        f"Стадия: {stage}. {stage_desc}\n" f"Уже заданные вопросы:\n{prev_q_str}\n\n"
    )

    if stage == 2 and prev_code_context:
        prompt += (
            f"Код с предыдущего этапа:\n{prev_code_context[:1000]}...\n\n"
            f"Кандидат написал такой промпт для его исправления:\n'{prev_answer}'\n\n"
            "Придумай реалистичную ситуацию (например, вирусный контент, наплыв пользователей, поломка на сервере или другая ситуация, которая ставит в рамки разработчика). "
            "Проблема должна быть связана с кодом выше. Задай вопрос: как кандидат будет выкручиваться из этой ситуации? "
            "Верни ТОЛЬКО текст вопроса."
        )
    else:
        prompt += "Задай СЛЕДУЮЩИЙ новый вопрос. Если выбрано несколько языков, задай вопрос по ДРУГОМУ языку из списка. Верни ТОЛЬКО текст вопроса."

    raw = ask_text(sys_prompt, prompt).strip()
    return _clean_text(raw)


def _evaluate_answer(
    stage: int, level: str, langs: str, question: str, answer: str, is_skip: bool
) -> int:
    if is_skip:
        return 0
    sys_prompt = SYSTEM_INTERVIEWER.format(level=level, langs=langs)

    prompt = (
        f"Стадия: {stage}.\n"
        f"Вопрос: {question}\n"
        f"Ответ кандидата: {answer}\n\n"
        f"Оцени ответ по шкале 0-100 (где 0 - бред, 100 - идеальный ответ). "
        f"Если ответ поверхностный — ставь 20-40. Если правильный — 70-100. "
        f"Верни ТОЛЬКО число (целое от 0 до 100), без текста."
    )

    raw = ask_text(sys_prompt, prompt).strip()
    match = re.search(r"\d+", raw)
    if match:
        score = int(match.group())
        return 0 if score <= 5 else max(0, min(100, score))
    return 40


def _generate_code_review_task(level: str, stack: str, langs: str) -> tuple[str, str]:
    sys_prompt = SYSTEM_INTERVIEWER.format(level=level, langs=langs)
    prompt = (
        f"Сгенерируй СЛОЖНЫЙ код СТРОГО на одном из этих языков: {langs}.\n"
        "Добавь проблемы с производительностью, безопасностью и архитектурой.\n"
        "КРИТИЧЕСКОЕ ПРАВИЛО: В коде НЕ ДОЛЖНО БЫТЬ КОММЕНТАРИЕВ, только чистый код с багами.\n"
        "Верни ответ СТРОГО в формате: сначала текст 'Найдите ошибки и уязвимости в этом коде и напишите промпт для ИИ, чтобы исправить их', затем символ '|', затем сам код."
    )
    raw = ask_text(sys_prompt, prompt).strip()

    if "|" in raw:
        parts = raw.split("|", 1)
        code = parts[1].strip()
        # ЖЕСТКАЯ ОЧИСТКА КОДА ОТ КОММЕНТАРИЕВ
        code = re.sub(r"#.*", "", code)
        code = re.sub(r"//.*", "", code)
        code = re.sub(r"/\*.*?\*/", "", code, flags=re.DOTALL)
        if "\n" not in code:
            code = code.replace("{", "{\n").replace("}", "\n}").replace(";", ";\n")
        return parts[0].strip(), code.strip()
    return "Найдите ошибки в коде и напишите промпт.", raw


@router.post("/start", response_model=StartInterviewResponse)
def start(req: StartInterviewRequest) -> StartInterviewResponse:
    langs_str = ", ".join(req.language_ids)
    it = create(req.level, req.stack_id, langs_str)

    q = _generate_pure_question(0, req.level, req.stack_id, langs_str, [])

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

    past_questions = [t.content for t in it.turns if t.role == "assistant"]
    last_question = past_questions[-1] if past_questions else ""

    it.turns.append(
        Turn(role="user", content=req.answer, seconds_spent=req.seconds_spent)
    )

    score = _evaluate_answer(
        it.stage, it.level, it.language_id, last_question, req.answer, is_skip
    )

    if not is_skip and score <= 15:
        it.finished = True
        it.rejected = True
        it.reject_reason = f"Ответ не по теме (Оценка: {score}/100)."
        save(it)
        return AnswerResponse(
            stage=it.stage,
            stage_name=STAGE_NAMES.get(it.stage, ""),
            finished=True,
            rejected=True,
            reject_reason=it.reject_reason,
        )

    answers_on_stage = sum(1 for t in it.turns if t.role == "user")

    if it.stage == 0 and answers_on_stage >= QUESTIONS_PER_STAGE:
        it.stage = 1
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
            stage=1, stage_name=STAGE_NAMES[1], question=question, code_snippet=code
        )

    elif it.stage == 1 and answers_on_stage >= QUESTIONS_PER_STAGE + 1:
        it.stage = 2
        prev_prompt = next(
            (
                t.content
                for t in reversed(it.turns)
                if t.role == "user" and len(t.content) > 10
            ),
            "",
        )
        prev_code = next(
            (
                t.content
                for t in reversed(it.turns)
                if t.role == "assistant" and "Код:" in t.content
            ),
            "",
        )
        q = _generate_pure_question(
            2,
            it.level,
            it.stack_id,
            it.language_id,
            past_questions,
            prev_code,
            prev_prompt,
        )
        it.turns.append(Turn(role="assistant", content=q, seconds_spent=0))
        save(it)
        return AnswerResponse(stage=2, stage_name=STAGE_NAMES[2], question=q)

    elif it.stage == 2 and answers_on_stage >= QUESTIONS_PER_STAGE + 2:
        it.finished = True
        save(it)
        return AnswerResponse(stage=2, stage_name=STAGE_NAMES[2], finished=True)

    q = _generate_pure_question(
        it.stage, it.level, it.stack_id, it.language_id, past_questions
    )
    if not q or len(q.strip()) < 10:
        q = "Опишите ваш подход к решению подобных задач."

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
    competency_code_understanding: int | None = None
    competency_prompting: int | None = None
    competency_adaptability: int | None = None
    competency_soft_skills: int | None = None
    total_score_100: int | None = None
    final_grade: str | None = None


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
    return {}


def _normalize_report_data(data: dict) -> dict:
    if not data:
        return {
            "summary": "ИИ не смог сформировать структурированный отчет.",
            "stages": [],
            "strengths": ["Интервью было завершено"],
            "gaps": ["Ошибка парсинга ответа ИИ"],
            "recommendation": "insufficient_evidence",
            "competency_architecture": 30,
            "competency_code_understanding": 30,
            "competency_prompting": 30,
            "competency_adaptability": 30,
            "competency_soft_skills": 30,
            "total_score_100": 30,
            "final_grade": "Reject",
        }

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
                "score": max(0, min(100, score)),
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

    comp_arch = data.get("competency_architecture") or 0
    comp_code = data.get("competency_code_understanding") or 0
    comp_prompt = data.get("competency_prompting") or 0
    comp_adapt = data.get("competency_adaptability") or 0
    comp_soft = data.get("competency_soft_skills") or 0
    total = data.get("total_score_100") or 0

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
        "competency_architecture": int(comp_arch),
        "competency_code_understanding": int(comp_code),
        "competency_prompting": int(comp_prompt),
        "competency_adaptability": int(comp_adapt),
        "competency_soft_skills": int(comp_soft),
        "total_score_100": int(total),
        "final_grade": str(data.get("final_grade", "Reject")),
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
            competency_architecture=0,
            competency_code_understanding=0,
            competency_prompting=0,
            competency_adaptability=0,
            competency_soft_skills=0,
            total_score_100=0,
            final_grade="Reject",
            rejected=True,
            reject_reason=it.reject_reason,
        )

    transcript_lines = []
    for t in it.turns:
        if t.role == "user":
            transcript_lines.append(
                f"{t.role} (потратил {t.seconds_spent} сек): {t.content}"
            )
        else:
            transcript_lines.append(f"{t.role}: {t.content}")
    transcript = "\n".join(transcript_lines)

    sys_prompt = SYSTEM_REPORT
    user = f"Уровень: {it.level}. Стек: {it.stack_id}. Языки: {it.language_id}.\nТранскрипт:\n{transcript}\n\nСформируй отчёт строго по схеме JSON."

    try:
        raw = ask_text(sys_prompt, user)
        normalized = _normalize_report_data(_parse_report_json(raw))
        parsed = _Report.model_validate(normalized)

        # ЖЕСТКАЯ ЛОГИКА ОПРЕДЕЛЕНИЯ ГРЕЙДА
        total = parsed.total_score_100 or 0

        # Если ИИ насчитал меньше 30, но мы знаем, что он ответил, ставим минимум 30
        if total < 30:
            grade = "Reject"
            total = 0  # Обнуляем, если реально провал
        elif total <= 55:
            grade = "Junior"
        elif total <= 80:
            grade = "Middle"
        else:
            grade = "Senior"

        # Игнорируем final_grade от ИИ, используем наш вычисленный grade
        return ReportResponse(
            interview_id=it.id,
            level=it.level,
            stack_id=it.stack_id,
            language_id=it.language_id,
            summary=parsed.summary,
            stages=parsed.stages,
            strengths=parsed.strengths,
            gaps=parsed.gaps,
            recommendation=(
                parsed.recommendation
                if parsed.recommendation in ("hire", "no_hire", "insufficient_evidence")
                else "insufficient_evidence"
            ),
            competency_architecture=parsed.competency_architecture,
            competency_code_understanding=parsed.competency_code_understanding,
            competency_prompting=parsed.competency_prompting,
            competency_adaptability=parsed.competency_adaptability,
            competency_soft_skills=parsed.competency_soft_skills,
            total_score_100=total,
            final_grade=grade,  # Используем вычисленный
            rejected=False,
            reject_reason=None,
        )
    except Exception as e:
        return ReportResponse(
            interview_id=it.id,
            level=it.level,
            stack_id=it.stack_id,
            language_id=it.language_id,
            summary=f"Ошибка генерации отчёта: {str(e)}",
            stages=[],
            strengths=[],
            gaps=[],
            recommendation="insufficient_evidence",
            competency_architecture=30,
            competency_code_understanding=30,
            competency_prompting=30,
            competency_adaptability=30,
            competency_soft_skills=30,
            total_score_100=30,
            final_grade="Reject",
            rejected=False,
            reject_reason=None,
        )
