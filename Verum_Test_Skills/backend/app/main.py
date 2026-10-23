from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth, catalog, interview, media

app = FastAPI(title="Verum API", version="0.1.0")

# Настройка CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],  # Разрешаем все методы (GET, POST, OPTIONS и т.д.)
    allow_headers=["*"],  # Разрешаем все заголовки (включая Authorization)
    expose_headers=[
        "*"
    ],  # Чтобы фронтенд мог читать кастомные заголовки, если появятся
)

# Подключение роутеров
app.include_router(media.router)
app.include_router(catalog.router)
app.include_router(interview.router)
app.include_router(auth.router)


@app.get("/api/health")
def health():
    return {"ok": True}
