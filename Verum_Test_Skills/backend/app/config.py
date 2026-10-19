import os

from dotenv import load_dotenv

# Ищем .env в корне проекта (на уровень выше app/)
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))


class Settings:
    GIGACHAT_CREDENTIALS: str = os.getenv("GIGACHAT_CREDENTIALS", "")
    GIGACHAT_SCOPE: str = os.getenv("GIGACHAT_SCOPE", "GIGACHAT_API_PERS")
    GIGACHAT_BASE_URL: str = os.getenv(
        "GIGACHAT_BASE_URL", "https://gigachat.devices.sberbank.ru/api/v1"
    )
    GIGACHAT_MODEL: str = os.getenv("GIGACHAT_MODEL", "GigaChat")
    GIGACHAT_VERIFY_SSL: bool = (
        os.getenv("GIGACHAT_VERIFY_SSL", "false").lower() == "true"
    )
    CORS_ORIGINS: list[str] = os.getenv("CORS_ORIGINS", "http://localhost:5173").split(
        ","
    )


settings = Settings()
