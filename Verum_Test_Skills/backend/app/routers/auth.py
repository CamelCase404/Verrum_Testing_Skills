from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import (
    UserDB,
    create_access_token,
    get_current_user,
    get_db,
    get_password_hash,
    verify_password,
)
from ..schemas import Token, UserProfile, UserRegister

router = APIRouter(prefix="/api/auth", tags=["auth"])


class LoginReq(BaseModel):
    email: str
    password: str


@router.post("/register", response_model=Token)
def register(data: UserRegister, db=Depends(get_db)):
    existing = db.query(UserDB).filter(UserDB.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = UserDB(
        email=data.email,
        hashed_password=get_password_hash(data.password),
        role=data.role.value,
        full_name=data.full_name,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.post("/login", response_model=Token)
def login(data: LoginReq, db=Depends(get_db)):
    user = db.query(UserDB).filter(UserDB.email == data.email).first()
    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    token = create_access_token({"sub": user.email})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserProfile)
def me(user: UserDB = Depends(get_current_user)):
    # явно прокидываем skills_data в поле skills (модель pydantic ждёт skills)
    return UserProfile(
        id=user.id,
        email=user.email,
        role=user.role,
        full_name=user.full_name,
        skills=user.skills_data,
        company_name=user.company_name,
        website=user.website,
    )


# --- Поиск кандидатов ---
class SearchRequest(BaseModel):
    grade: Optional[str] = None
    stack: Optional[str] = None
    language: Optional[str] = None


class CandidateProfile(BaseModel):
    id: int
    full_name: str
    email: str
    final_grade: str
    total_score: int
    stack: str
    language: str
    summary: str


@router.post("/search", response_model=list[CandidateProfile])
def search_candidates(req: SearchRequest, db=Depends(get_db)):
    query = db.query(UserDB).filter(
        UserDB.role == "developer", UserDB.skills_data.isnot(None)
    )
    users = query.all()

    results = []
    for u in users:
        data = u.skills_data
        if not data:
            continue

        match = True
        if req.grade and data.get("final_grade", "").lower() != req.grade.lower():
            match = False
        if req.stack and data.get("stack_id", "").lower() != req.stack.lower():
            match = False
        if (
            req.language
            and req.language.lower() not in data.get("language_id", "").lower()
        ):
            match = False

        if match:
            results.append(
                CandidateProfile(
                    id=u.id,
                    full_name=u.full_name,
                    email=u.email,
                    final_grade=data.get("final_grade", "Unknown"),
                    total_score=data.get("total_score_100", 0),
                    stack=data.get("stack_id", ""),
                    language=data.get("language_id", ""),
                    summary=data.get("summary", ""),
                )
            )

    results.sort(key=lambda x: x.total_score, reverse=True)
    return results


# --- Прием отчета от ИИ-собеседования ---
class SkillsReport(BaseModel):
    final_grade: str
    total_score_100: int
    stack_id: str
    language_id: str
    summary: str
    stages: Optional[list[dict]] = None
    strengths: Optional[list[str]] = None
    gaps: Optional[list[str]] = None
    recommendation: Optional[str] = None
    competency_architecture: Optional[int] = None
    competency_code_understanding: Optional[int] = None
    competency_prompting: Optional[int] = None
    competency_adaptability: Optional[int] = None
    competency_soft_skills: Optional[int] = None


@router.post("/skills")
def save_skills(
    report: SkillsReport,
    user: UserDB = Depends(get_current_user),
    db=Depends(get_db),
):
    if user.role != "developer":
        raise HTTPException(status_code=403, detail="Only developers can submit skills")
    user.skills_data = report.model_dump()
    db.commit()
    db.refresh(user)
    return {"status": "ok", "skills_data": user.skills_data}
