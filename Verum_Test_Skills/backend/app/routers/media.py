import os
import uuid
from pathlib import Path

from fastapi import APIRouter, File, HTTPException, UploadFile

router = APIRouter(prefix="/api/media", tags=["media"])

# Папка для хранения (создастся автоматически)
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)


@router.post("/upload")
async def upload_video(interview_id: str, file: UploadFile = File(...)):
    # Проверяем, что это видео/аудио
    if not file.content_type.startswith(("video/", "audio/")):
        raise HTTPException(400, "Разрешены только видео или аудио файлы")

    # Генерируем уникальное имя
    ext = file.filename.split(".")[-1] if file.filename else "webm"
    filename = f"{interview_id}_{uuid.uuid4().hex[:8]}.{ext}"
    filepath = UPLOAD_DIR / filename

    # Сохраняем файл кусками, чтобы не забить память
    try:
        with open(filepath, "wb") as buffer:
            while chunk := await file.read(1024 * 1024):  # по 1 МБ
                buffer.write(chunk)
    except Exception as e:
        raise HTTPException(500, f"Ошибка сохранения: {e}")

    return {"status": "ok", "filename": filename, "path": str(filepath)}
