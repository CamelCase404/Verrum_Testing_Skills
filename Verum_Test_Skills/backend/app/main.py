from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import catalog, interview, media

app = FastAPI(title="Verum API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(media.router)
app.include_router(catalog.router)
app.include_router(interview.router)


@app.get("/api/health")
def health():
    return {"ok": True}
