from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.auth.routes import router as auth_router
from app.database import engine
from app.listings.routes import router as listings_router
from app.upload.routes import router as upload_router
from app.users.routes import router as users_router

app = FastAPI(title="Revvbase API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # T-01-05 — tighten before public launch
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api/v1/auth", tags=["auth"])
app.include_router(listings_router, prefix="/api/v1/listings", tags=["listings"])
app.include_router(users_router, prefix="/api/v1/users", tags=["users"])
app.include_router(upload_router, prefix="/api/v1/upload", tags=["upload"])


@app.get("/api/v1/health")
async def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:  # noqa: BLE001
        return {"status": "degraded", "db": str(e)}
