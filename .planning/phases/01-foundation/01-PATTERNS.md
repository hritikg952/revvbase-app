# Phase 1: Foundation - Pattern Map

**Mapped:** 2026-05-04
**Files analyzed:** 28 new files (greenfield — no existing source)
**Analogs found:** 0 / 28 (greenfield project — patterns sourced from RESEARCH.md)

---

## Greenfield Declaration

This repository contains **no source code**. The only files present at pattern-mapping time are:

- `CLAUDE.md` — project instructions and stack decisions
- `design/` — HTML/PNG mockups (visual reference only, not code to copy)
- `.planning/` — planning documents

There are no existing controllers, services, components, routers, models, hooks, or config files to map patterns from. **All patterns in this document are sourced from RESEARCH.md code examples, official library documentation, and locked decisions in CONTEXT.md.** Phase 1 establishes the patterns that all subsequent phases will treat as analogs.

---

## File Classification

| New File | Role | Data Flow | Closest Analog | Match Quality |
|----------|------|-----------|----------------|---------------|
| `backend/app/main.py` | app-init | request-response | RESEARCH.md Pattern 1 | reference-only |
| `backend/app/config.py` | config | — | RESEARCH.md Pattern 2 | reference-only |
| `backend/app/database.py` | provider | CRUD | RESEARCH.md Pattern 4 (implied) | reference-only |
| `backend/app/dependencies.py` | middleware | request-response | RESEARCH.md Pattern 12 (implied) | reference-only |
| `backend/app/auth/models.py` | model | CRUD | RESEARCH.md Pattern 4 | reference-only |
| `backend/app/auth/schemas.py` | model | request-response | RESEARCH.md Pattern 12 | reference-only |
| `backend/app/auth/routes.py` | controller | request-response | RESEARCH.md Pattern 12 | reference-only |
| `backend/app/listings/models.py` | model | CRUD | RESEARCH.md Pattern 4 | reference-only |
| `backend/app/listings/schemas.py` | model | request-response | — | no-analog |
| `backend/app/listings/routes.py` | controller | request-response | RESEARCH.md Pattern 1 (stub) | reference-only |
| `backend/app/users/models.py` | model | CRUD | RESEARCH.md Pattern 4 | reference-only |
| `backend/app/users/schemas.py` | model | request-response | — | no-analog |
| `backend/app/users/routes.py` | controller | request-response | RESEARCH.md Pattern 1 (stub) | reference-only |
| `backend/app/upload/routes.py` | controller | file-I/O | RESEARCH.md Pattern 11 | reference-only |
| `backend/alembic/env.py` | config | batch | RESEARCH.md Pattern 5 | reference-only |
| `backend/alembic/versions/001_initial_schema.py` | migration | batch | RESEARCH.md Pattern 5 | reference-only |
| `backend/pyproject.toml` | config | — | RESEARCH.md Installation Commands | reference-only |
| `backend/railway.toml` | config | — | RESEARCH.md Pattern 3 | reference-only |
| `backend/.env.example` | config | — | RESEARCH.md Pattern 13 | reference-only |
| `backend/tests/conftest.py` | test | request-response | RESEARCH.md Validation Architecture | reference-only |
| `backend/tests/test_health.py` | test | request-response | RESEARCH.md Validation Architecture | reference-only |
| `backend/tests/test_auth.py` | test | request-response | RESEARCH.md Validation Architecture | reference-only |
| `frontend/src/theme/types.ts` | config | — | RESEARCH.md Pattern 7 | reference-only |
| `frontend/src/theme/ThemeContext.tsx` | provider | — | RESEARCH.md Pattern 7 | reference-only |
| `frontend/src/theme/darkTheme.ts` | config | — | RESEARCH.md Pattern 8 + DESIGN.md | reference-only |
| `frontend/src/theme/lightTheme.ts` | config | — | RESEARCH.md Pattern 7 (stub) | reference-only |
| `frontend/src/navigation/RootNavigator.tsx` | component | — | RESEARCH.md Pattern 9 | reference-only |
| `frontend/src/api/client.ts` | utility | request-response | RESEARCH.md Pattern 10 | reference-only |
| `frontend/src/store/authStore.ts` | store | — | RESEARCH.md Pitfall 7 | reference-only |
| `frontend/src/screens/HomeScreen.tsx` | component | — | — | no-analog |
| `frontend/src/screens/CreateScreen.tsx` | component | — | — | no-analog |
| `frontend/src/screens/ProfileScreen.tsx` | component | — | — | no-analog |
| `frontend/src/components/AuthGateSheet.tsx` | component | event-driven | — | no-analog |
| `frontend/App.tsx` | app-init | — | RESEARCH.md Pattern 6 | reference-only |
| `frontend/.env.example` | config | — | RESEARCH.md Pattern 13 | reference-only |

---

## Pattern Assignments

### `backend/app/main.py` (app-init, request-response)

**Source:** RESEARCH.md Pattern 1

**Full pattern:**
```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.routes import router as auth_router
from app.listings.routes import router as listings_router
from app.users.routes import router as users_router
from app.upload.routes import router as upload_router
from sqlalchemy import text
from app.database import engine

app = FastAPI(title="Revvbase API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten in production
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
    except Exception as e:
        return {"status": "degraded", "db": str(e)}, 503
```

**Notes:**
- CORS wildcard is intentional for MVP development; document as known tech debt
- Health check must verify DB connection (not just return 200) so Railway's healthcheckPath validates the full stack
- Import order: stdlib → third-party → local app imports

---

### `backend/app/config.py` (config)

**Source:** RESEARCH.md Pattern 2

**Full pattern:**
```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from functools import lru_cache

class Settings(BaseSettings):
    database_url: str
    secret_key: str
    cloudinary_cloud_name: str
    cloudinary_api_key: str
    cloudinary_api_secret: str
    mock_otp: bool = True  # MOCK_OTP env var; default True for local dev

    model_config = SettingsConfigDict(env_file=".env", case_sensitive=False)

@lru_cache
def get_settings() -> Settings:
    return Settings()
```

**Notes:**
- `@lru_cache` on `get_settings()` — not on the class — is the FastAPI-recommended pattern
- `mock_otp: bool = True` means local dev is always mocked; Railway must explicitly set `MOCK_OTP=false` before Phase 2 launch
- All route files obtain settings via `Depends(get_settings)` or a direct `get_settings()` call; never read `os.environ` directly in route handlers

---

### `backend/app/database.py` (provider, CRUD)

**Source:** FastAPI SQLModel docs (implied by RESEARCH.md Pattern 4)

**Pattern:**
```python
from sqlmodel import create_engine, Session, SQLModel
from app.config import get_settings

settings = get_settings()
engine = create_engine(settings.database_url, echo=False)

def get_db():
    with Session(engine) as session:
        yield session
```

**Notes:**
- `echo=False` in production; can be set `True` locally via env var for SQL debugging
- `get_db` is a FastAPI dependency injected via `Depends(get_db)` in route functions
- `SQLModel.metadata` is used in `alembic/env.py` as `target_metadata`

---

### `backend/app/dependencies.py` (middleware stub, request-response)

**Source:** Implied by Phase 1 scope — stub only, implemented in Phase 2

**Pattern:**
```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
):
    """Phase 1: stub — always raises 401 if called.
    Phase 2: validate JWT, return user from DB.
    """
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    raise HTTPException(status_code=status.HTTP_501_NOT_IMPLEMENTED, detail="Auth not yet implemented")
```

**Notes:**
- Phase 1 routes do NOT use this dependency — it is defined here so Phase 2 can import it without changing route signatures
- Import path for all route files that need auth: `from app.dependencies import get_current_user`

---

### `backend/app/auth/models.py` (model, CRUD)

**Source:** RESEARCH.md Pattern 4 (SQLModel field pattern)

**Pattern:**
```python
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class User(SQLModel, table=True):
    __tablename__ = "users"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    phone: str = Field(max_length=15, unique=True, index=True)
    display_name: Optional[str] = Field(default=None, max_length=100)
    phone_verified: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
```

**Notes:**
- `table=True` marks this as a DB table model (not a pure Pydantic schema)
- Non-table models (pure Pydantic) omit `table=True` — use for `schemas.py` request/response shapes
- UUID PKs: always `default_factory=uuid.uuid4` in Python; `gen_random_uuid()` as server default in migration SQL for DB-generated UUIDs
- Do NOT cross-import User into listings domain — listings reference it via `seller_id: uuid.UUID = Field(foreign_key="users.id")` only

---

### `backend/app/auth/schemas.py` (model, request-response)

**Source:** RESEARCH.md Pattern 12 (implied types)

**Pattern:**
```python
from pydantic import BaseModel

class OTPSendRequest(BaseModel):
    phone: str  # E.164 format recommended: +91XXXXXXXXXX

class OTPVerifyRequest(BaseModel):
    phone: str
    otp: str

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
```

**Notes:**
- Use `BaseModel` (not `SQLModel`) for request/response schemas — they are not DB tables
- Phone validation regex (E.164): add in Phase 2 when real MSG91 is wired; Phase 1 accepts any string

---

### `backend/app/auth/routes.py` (controller, request-response)

**Source:** RESEARCH.md Pattern 12

**Full pattern:**
```python
from fastapi import APIRouter, HTTPException
from app.config import get_settings
from app.auth.schemas import OTPSendRequest, OTPVerifyRequest, TokenResponse

router = APIRouter()

@router.post("/send-otp")
async def send_otp(request: OTPSendRequest):
    settings = get_settings()
    if settings.mock_otp:
        return {"message": "OTP sent (mock)", "phone": request.phone}
    # Real MSG91 call — Phase 2
    raise HTTPException(status_code=501, detail="Real OTP not yet implemented")

@router.post("/verify-otp", response_model=TokenResponse)
async def verify_otp(request: OTPVerifyRequest):
    settings = get_settings()
    if settings.mock_otp:
        if request.otp == "123456":
            return TokenResponse(access_token="mock_token", token_type="bearer")
        raise HTTPException(status_code=400, detail="Invalid OTP")
    # Real MSG91 verify + JWT issue — Phase 2
    raise HTTPException(status_code=501, detail="Real OTP not yet implemented")
```

**Notes:**
- Rate limiting via `slowapi` must be applied to `/send-otp` even in mock mode — establishes the pattern before production traffic
- `response_model=TokenResponse` on verify: FastAPI validates and serializes the return shape

---

### `backend/app/listings/models.py` (model, CRUD)

**Source:** RESEARCH.md Pattern 4 (GeoAlchemy2 field pattern — critical)

**Full pattern:**
```python
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Integer, JSON, Text, String
from geoalchemy2 import Geography

class Listing(SQLModel, table=True):
    __tablename__ = "listings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    seller_id: uuid.UUID = Field(foreign_key="users.id")
    vehicle_type: str  # motorcycle | scooter | ev | bicycle
    make: str
    model: str
    year: int
    odometer_km: Optional[int] = None
    price: int = Field(sa_column=Column(Integer, nullable=False))  # INR, no paise
    city: str
    fuel_type: Optional[str] = None
    owners: int = Field(default=1)
    insurance_date: Optional[datetime] = None
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    status: str = Field(default="active")  # active | sold | deleted (D-13: soft-delete)
    attributes: dict = Field(default={}, sa_column=Column(JSON))  # EV-specific fields
    location: Optional[object] = Field(
        default=None,
        sa_column=Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class ListingPhoto(SQLModel, table=True):
    __tablename__ = "listing_photos"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    listing_id: uuid.UUID = Field(foreign_key="listings.id")
    cloudinary_public_id: str  # NEVER store full URL — D-09
    sort_order: int = Field(default=0)  # 0 = cover photo
    created_at: datetime = Field(default_factory=datetime.utcnow)


class VehicleMake(SQLModel, table=True):
    __tablename__ = "vehicle_makes"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    make: str   # e.g. "Honda"
    model: str  # e.g. "Activa 6G"
    vehicle_type: str  # motorcycle | scooter | ev | bicycle
```

**Critical pitfall:** `location` field MUST use `sa_column=Column(Geography(...))` — SQLModel cannot resolve `Geography` as a Python type hint. Any attempt to use `Optional[Geography]` directly as a type annotation will fail at migration or runtime.

---

### `backend/app/listings/routes.py` and `backend/app/users/routes.py` (controller stubs)

**Source:** RESEARCH.md Pattern 1 (router registration pattern)

**Pattern (both files follow this stub shape):**
```python
from fastapi import APIRouter

router = APIRouter()

# Phase 1: stub — routes registered, not implemented
# Phase 2+ will add route handlers here
```

**Notes:**
- Registering empty routers in Phase 1 ensures the import chain in `main.py` is tested and working
- Future phases add handlers to these files; the router prefix is set in `main.py`, not here

---

### `backend/app/upload/routes.py` (controller, file-I/O)

**Source:** RESEARCH.md Pattern 11

**Full pattern:**
```python
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/signature")
async def get_upload_signature():
    """Generate a signed upload signature for direct Cloudinary upload.
    Phase 1: stub — returns 501 until Cloudinary credentials are configured (Phase 3).
    """
    raise HTTPException(status_code=501, detail="Not yet implemented")
```

**Phase 3 implementation reference** (do not implement now, keep as inline comment):
```python
# Phase 3 pattern:
# import time, cloudinary
# timestamp = int(time.time())
# params = {"timestamp": timestamp, "folder": "revvbase/listings"}
# signature = cloudinary.utils.api_sign_request(params, settings.cloudinary_api_secret)
# return {"signature": signature, "timestamp": timestamp,
#         "api_key": settings.cloudinary_api_key,
#         "cloud_name": settings.cloudinary_cloud_name}
```

---

### `backend/alembic/env.py` (config, batch)

**Source:** RESEARCH.md Pattern 5 — GeoAlchemy2 helpers are mandatory

**Critical additions to standard Alembic env.py:**
```python
from geoalchemy2 import alembic_helpers
from sqlmodel import SQLModel
# Import all models so their metadata is registered:
from app.auth.models import User  # noqa: F401
from app.listings.models import Listing, ListingPhoto, VehicleMake  # noqa: F401

target_metadata = SQLModel.metadata

# In run_migrations_online():
with connectable.connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=alembic_helpers.include_object,  # excludes PostGIS system tables
        include_schemas=True,
        render_item=alembic_helpers.render_item,  # correct Geography column rendering
    )
```

**Why this is critical:** Without `include_object=alembic_helpers.include_object`, Alembic autogenerate will attempt to create/drop `spatial_ref_sys`, `geometry_columns`, and `geography_columns` — PostGIS system tables. This corrupts PostGIS state and is irreversible without dropping the DB.

---

### `backend/alembic/versions/001_initial_schema.py` (migration, batch)

**Source:** RESEARCH.md Pattern 5 + Code Examples (seed data)

**Full structure pattern:**
```python
"""Initial schema: users, listings, listing_photos, vehicle_makes + PostGIS

Revision ID: 001
Revises:
Create Date: 2026-05-04
"""
from alembic import op
import sqlalchemy as sa
from geoalchemy2 import Geography

revision = '001'
down_revision = None
branch_labels = None
depends_on = None

def upgrade():
    # Extensions — safe to run even if pre-installed (Railway PostGIS template)
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")

    op.create_table(
        "users",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(15), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("phone_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "listings",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("seller_id", sa.UUID, sa.ForeignKey("users.id"), nullable=False),
        sa.Column("vehicle_type", sa.String(50), nullable=False),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("year", sa.Integer, nullable=False),
        sa.Column("odometer_km", sa.Integer, nullable=True),
        sa.Column("price", sa.Integer, nullable=False),  # INR, no paise
        sa.Column("city", sa.String(100), nullable=False),
        sa.Column("fuel_type", sa.String(50), nullable=True),
        sa.Column("owners", sa.Integer, nullable=False, server_default="1"),
        sa.Column("insurance_date", sa.Date, nullable=True),
        sa.Column("description", sa.Text, nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="active"),
        sa.Column("attributes", sa.JSON, nullable=False, server_default="{}"),
        sa.Column("location", Geography(geometry_type="POINT", srid=4326), nullable=True),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    op.execute("CREATE INDEX idx_listings_location ON listings USING GIST(location)")
    op.create_index("idx_listings_seller_id", "listings", ["seller_id"])
    op.create_index("idx_listings_status", "listings", ["status"])

    op.create_table(
        "listing_photos",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("listing_id", sa.UUID, sa.ForeignKey("listings.id"), nullable=False),
        sa.Column("cloudinary_public_id", sa.String(255), nullable=False),  # NOT full URL
        sa.Column("sort_order", sa.Integer, nullable=False, server_default="0"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )

    op.create_table(
        "vehicle_makes",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("make", sa.String(100), nullable=False),
        sa.Column("model", sa.String(100), nullable=False),
        sa.Column("vehicle_type", sa.String(50), nullable=False),
    )

    # Seed vehicle_makes (see RESEARCH.md Code Examples for full INSERT)
    op.execute("""
    INSERT INTO vehicle_makes (id, make, model, vehicle_type) VALUES
      (gen_random_uuid(), 'Honda', 'Activa 6G', 'scooter'),
      (gen_random_uuid(), 'Honda', 'Shine', 'motorcycle'),
      (gen_random_uuid(), 'Honda', 'CB Unicorn', 'motorcycle'),
      (gen_random_uuid(), 'Yamaha', 'FZ S-FI', 'motorcycle'),
      (gen_random_uuid(), 'Yamaha', 'Fascino 125', 'scooter'),
      (gen_random_uuid(), 'Yamaha', 'R15 V4', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Classic 350', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Meteor 350', 'motorcycle'),
      (gen_random_uuid(), 'Royal Enfield', 'Himalayan', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Pulsar 150', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Pulsar NS200', 'motorcycle'),
      (gen_random_uuid(), 'Bajaj', 'Chetak', 'ev'),
      (gen_random_uuid(), 'TVS', 'Apache RTR 160', 'motorcycle'),
      (gen_random_uuid(), 'TVS', 'Jupiter', 'scooter'),
      (gen_random_uuid(), 'TVS', 'iQube ST', 'ev'),
      (gen_random_uuid(), 'Hero', 'Splendor Plus', 'motorcycle'),
      (gen_random_uuid(), 'Hero', 'HF Deluxe', 'motorcycle'),
      (gen_random_uuid(), 'Suzuki', 'Access 125', 'scooter'),
      (gen_random_uuid(), 'Suzuki', 'Gixxer', 'motorcycle'),
      (gen_random_uuid(), 'KTM', 'Duke 200', 'motorcycle'),
      (gen_random_uuid(), 'KTM', 'Duke 390', 'motorcycle'),
      (gen_random_uuid(), 'Ola', 'S1 Pro', 'ev'),
      (gen_random_uuid(), 'Ola', 'S1 Air', 'ev'),
      (gen_random_uuid(), 'Ather', '450X', 'ev'),
      (gen_random_uuid(), 'Ather', '450S', 'ev'),
      (gen_random_uuid(), 'Other', 'Other', 'motorcycle'),
      (gen_random_uuid(), 'Other', 'Other', 'scooter'),
      (gen_random_uuid(), 'Other', 'Other', 'ev'),
      (gen_random_uuid(), 'Other', 'Other', 'bicycle')
    """)

def downgrade():
    op.drop_table("vehicle_makes")
    op.drop_table("listing_photos")
    op.drop_table("listings")
    op.drop_table("users")
```

---

### `backend/railway.toml` (config)

**Source:** RESEARCH.md Pattern 3

**Full file:**
```toml
[deploy]
preDeployCommand = "alembic upgrade head"
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
```

**Notes:**
- Railway service root directory must be set to `/backend` in the Railway dashboard
- `$PORT` is injected by Railway — never hardcode 8000
- `preDeployCommand` runs migrations before each deploy; zero-downtime migration pattern

---

### `backend/pyproject.toml` (config)

**Source:** RESEARCH.md Installation Commands + Claude's Discretion (uv preferred)

**Full file:**
```toml
[project]
name = "revvbase-backend"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
    "fastapi>=0.136.1",
    "uvicorn[standard]>=0.46.0",
    "sqlmodel>=0.0.38",
    "alembic>=1.18.4",
    "geoalchemy2>=0.19.0",
    "psycopg2-binary>=2.9.12",
    "pydantic-settings>=2.14.0",
    "python-dotenv>=1.2.2",
    "python-multipart>=0.0.27",
    "pyjwt>=2.12.1",
    "httpx>=0.28.1",
    "cloudinary>=1.44.2",
    "slowapi>=0.1.9",
]

[project.optional-dependencies]
dev = [
    "ruff>=0.15.12",
    "pytest>=8.0.0",
    "pytest-asyncio>=1.3.0",
]

[tool.ruff]
line-length = 88
target-version = "py311"

[tool.ruff.lint]
select = ["E", "F", "I", "UP"]

[tool.pytest.ini_options]
asyncio_mode = "auto"
testpaths = ["tests"]
```

---

### `backend/.env.example` (config)

**Source:** RESEARCH.md Pattern 13

**Full file:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=changeme_generate_with_openssl_rand_hex_32
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MOCK_OTP=true
```

---

### `backend/tests/conftest.py` (test, request-response)

**Source:** RESEARCH.md Validation Architecture

**Pattern:**
```python
import pytest
from fastapi.testclient import TestClient
from app.main import app

@pytest.fixture(scope="module")
def client():
    with TestClient(app) as c:
        yield c
```

**Notes:**
- `TestClient` from `fastapi.testclient` (wraps Starlette's test client) — does NOT require a real DB for unit tests
- For integration tests (PostGIS, seed data), use a test DB via `DATABASE_URL` override in test env
- `asyncio_mode = "auto"` in `pyproject.toml` means no `@pytest.mark.asyncio` decorator needed on async tests

---

### `backend/tests/test_health.py` and `backend/tests/test_auth.py` (test, request-response)

**Source:** RESEARCH.md Validation Architecture

**Pattern (health):**
```python
def test_health_returns_200(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

def test_health_db_connected(client):
    response = client.get("/api/v1/health")
    assert response.json().get("db") == "connected"
```

**Pattern (auth mock OTP):**
```python
def test_mock_otp_send(client):
    response = client.post("/api/v1/auth/send-otp", json={"phone": "+919876543210"})
    assert response.status_code == 200

def test_mock_otp_verify_valid(client):
    response = client.post("/api/v1/auth/verify-otp", json={"phone": "+919876543210", "otp": "123456"})
    assert response.status_code == 200
    assert "access_token" in response.json()

def test_mock_otp_verify_invalid(client):
    response = client.post("/api/v1/auth/verify-otp", json={"phone": "+919876543210", "otp": "000000"})
    assert response.status_code == 400
```

---

### `frontend/App.tsx` (app-init)

**Source:** RESEARCH.md Pattern 6

**Full pattern:**
```tsx
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';
import { ThemeProvider } from './src/theme/ThemeContext';
import { RootNavigator } from './src/navigation/RootNavigator';

// Must be called OUTSIDE the component — runs once at module load
SplashScreen.preventAutoHideAsync();

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    SpaceGrotesk_400Regular,
    SpaceGrotesk_500Medium,
    SpaceGrotesk_600SemiBold,
    SpaceGrotesk_700Bold,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync();
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null; // Keep splash visible while fonts load
  }

  return (
    <ThemeProvider>
      <RootNavigator />
    </ThemeProvider>
  );
}
```

**Notes:**
- `SplashScreen.preventAutoHideAsync()` must be module-level (outside component) — calling inside the component causes a race condition
- Font error is handled gracefully: if fonts fail to load, the splash still hides and the app renders with system fallback fonts
- `ThemeProvider` wraps `RootNavigator` so all navigation screens have theme access

---

### `frontend/src/theme/types.ts` (config)

**Source:** RESEARCH.md Pattern 7

**Full pattern:**
```typescript
export interface Theme {
  colors: {
    background: string;
    surface: string;
    surfaceContainer: string;
    primary: string;
    onPrimary: string;
    primaryAction: string;
    accent: string;       // Nitro Blue
    textPrimary: string;
    textSecondary: string;
    outline: string;
    error: string;
  };
  typography: {
    displayXl: { fontFamily: string; fontSize: number; fontWeight: string; letterSpacing: number };
    headlineLg: { fontFamily: string; fontSize: number; fontWeight: string };
    headlineMd: { fontFamily: string; fontSize: number; fontWeight: string };
    bodyLg: { fontFamily: string; fontSize: number; lineHeight: number };
    bodyMd: { fontFamily: string; fontSize: number; lineHeight: number };
    labelCaps: { fontFamily: string; fontSize: number; fontWeight: string; letterSpacing: number };
  };
  spacing: {
    unit: number;   // 4
    gutter: number; // 24
    margin: number; // 32
    xs: number;     // 4
    sm: number;     // 8
    md: number;     // 16
    lg: number;     // 24
    xl: number;     // 32
  };
  roundness: {
    sm: number;   // 2
    md: number;   // 6
    lg: number;   // 8
    xl: number;   // 12
    full: number; // 9999
  };
}
```

**Hard constraint (D-17):** Every component that needs colors, typography, or spacing MUST obtain values via `useTheme()`. Never import raw hex strings or magic numbers into component files.

---

### `frontend/src/theme/ThemeContext.tsx` (provider)

**Source:** RESEARCH.md Pattern 7

**Full pattern:**
```tsx
import React, { createContext, useContext } from 'react';
import { Theme } from './types';
import { darkTheme } from './darkTheme';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Future: accept theme prop or derive from Appearance.getColorScheme()
  return <ThemeContext.Provider value={darkTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

---

### `frontend/src/theme/darkTheme.ts` (config)

**Source:** RESEARCH.md Pattern 8 — MUST read `design/high_performance_dark_mode/DESIGN.md` first

**Critical:** The executor MUST read `design/high_performance_dark_mode/DESIGN.md` before writing this file. YAML frontmatter values in that file are authoritative over prose descriptions.

**Token mapping from DESIGN.md (verified in RESEARCH.md Pattern 8):**

| DESIGN.md Token | TypeScript key | Value |
|-----------------|----------------|-------|
| `background` | `colors.background` | `#1e0f11` |
| `on-background` | `colors.textPrimary` | `#f8dcdd` |
| `on-surface-variant` | `colors.textSecondary` | `#e2bec0` |
| `surface-container` | `colors.surface` | `#2b1b1d` |
| `surface-container-high` | `colors.surfaceContainer` | `#362627` |
| `primary` | `colors.primary` | `#ffb2b8` |
| `primary-container` | `colors.primaryAction` | `#ff506f` |
| `tertiary` | `colors.accent` (Nitro Blue) | `#58d6f1` |
| `outline` | `colors.outline` | `#a9898b` |
| `error` | `colors.error` | `#ffb4ab` |

**Typography rules:**
- All font families: `SpaceGrotesk_700Bold`, `SpaceGrotesk_600SemiBold`, `SpaceGrotesk_500Medium`, `SpaceGrotesk_400Regular` (loaded in App.tsx)
- fontSize: drop "px", convert to number
- lineHeight: `Math.round(fontSize * ratio)` where ratio comes from DESIGN.md (e.g., 1.6)
- letterSpacing: `fontSize * em_value` (e.g., -0.02em on 32px = -0.64)

**Spacing:** `unit: 4, gutter: 24, margin: 32, xs: 4, sm: 8, md: 16, lg: 24, xl: 32`

**Roundness:** `sm: 2, md: 6, lg: 8, xl: 12, full: 9999`

---

### `frontend/src/theme/lightTheme.ts` (config stub)

**Source:** RESEARCH.md Pattern 7 (D-16: swappable theme)

**Pattern:**
```typescript
import { Theme } from './types';

// Phase 1 stub — light theme is not the active design
// Implements Theme interface with placeholder values
// Full implementation: future phase or designer handoff
export const lightTheme: Theme = {
  colors: {
    background: '#FFFFFF',
    surface: '#F5F5F5',
    surfaceContainer: '#EEEEEE',
    primary: '#D32F2F',
    onPrimary: '#FFFFFF',
    primaryAction: '#B71C1C',
    accent: '#0097A7',
    textPrimary: '#212121',
    textSecondary: '#757575',
    outline: '#BDBDBD',
    error: '#D32F2F',
  },
  // ... typography and spacing identical to darkTheme (font metrics don't change with theme)
};
```

---

### `frontend/src/navigation/RootNavigator.tsx` (component)

**Source:** RESEARCH.md Pattern 9

**Full pattern:**
```tsx
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import HomeScreen from '../screens/HomeScreen';
import CreateScreen from '../screens/CreateScreen';
import ProfileScreen from '../screens/ProfileScreen';

const Tab = createBottomTabNavigator();
const HomeStack = createNativeStackNavigator();
const CreateStack = createNativeStackNavigator();
const ProfileStack = createNativeStackNavigator();

function HomeStackNavigator() {
  return (
    <HomeStack.Navigator screenOptions={{ headerShown: false }}>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}

function CreateStackNavigator() {
  return (
    <CreateStack.Navigator screenOptions={{ headerShown: false }}>
      <CreateStack.Screen name="Create" component={CreateScreen} />
    </CreateStack.Navigator>
  );
}

function ProfileStackNavigator() {
  return (
    <ProfileStack.Navigator screenOptions={{ headerShown: false }}>
      <ProfileStack.Screen name="Profile" component={ProfileScreen} />
    </ProfileStack.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Home', headerShown: false }} />
        <Tab.Screen name="CreateTab" component={CreateStackNavigator} options={{ title: 'Create', headerShown: false }} />
        <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ title: 'Profile', headerShown: false }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

**Notes:**
- `headerShown: false` on native stack screens prevents double headers (tab bar has its own header)
- Auth guard (D-05): CreateTab and ProfileTab onPress handlers check auth state from `useAuthStore`; if unauthenticated, show `AuthGateSheet` instead of navigating. This is wired in the Tab.Screen `listeners` prop, not inside the stack screens.
- React Navigation 7 (stable) — do NOT install v8 alpha packages

---

### `frontend/src/api/client.ts` (utility, request-response)

**Source:** RESEARCH.md Pattern 10

**Full pattern:**
```typescript
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — stub for Phase 2 token injection
apiClient.interceptors.request.use(
  (config) => config,  // Phase 2: inject `Authorization: Bearer <token>` from authStore
  (error) => Promise.reject(error)
);

// Response interceptor — stub for Phase 2 error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => Promise.reject(error)
);
```

**Critical (Pitfall 6):** The env var MUST be `EXPO_PUBLIC_API_URL` with the `EXPO_PUBLIC_` prefix. Without it, Expo CLI will not inline the value at build time and `process.env.EXPO_PUBLIC_API_URL` will be `undefined` at runtime.

---

### `frontend/src/store/authStore.ts` (store)

**Source:** RESEARCH.md Pitfall 7 (zustand 5.x API)

**Full pattern:**
```typescript
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  setToken: (token: string | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  isAuthenticated: false,
  setToken: (token) => set({ token, isAuthenticated: token !== null }),
  clearAuth: () => set({ token: null, isAuthenticated: false }),
}));
```

**Notes:**
- Import is `import { create } from 'zustand'` (zustand 5.x) — not `import create from 'zustand'` (v4 default export, removed in v5)
- Token persistence to `expo-secure-store` is stubbed in Phase 1; implemented in Phase 2 when real JWTs are issued
- `isAuthenticated` derived from `token !== null` — avoids a separate boolean flag that can drift out of sync

---

### `frontend/src/screens/HomeScreen.tsx`, `CreateScreen.tsx`, `ProfileScreen.tsx` (component stubs)

**Source:** No analog (greenfield placeholder screens)

**Pattern (same shape for all three, substitute screen name):**
```tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function HomeScreen() {
  const theme = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <Text style={[styles.title, { color: theme.colors.textPrimary, fontFamily: 'SpaceGrotesk_600SemiBold' }]}>
        Home
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24 },
});
```

**Hard constraint:** Even placeholder screens MUST use `useTheme()` — no hardcoded colors. This establishes the pattern for all future screens.

---

### `frontend/src/components/AuthGateSheet.tsx` (component, event-driven)

**Source:** No direct analog — new pattern for this project

**Library dependency:** `@gorhom/bottom-sheet` + `react-native-gesture-handler` + `react-native-reanimated` (identified in RESEARCH.md Open Questions as the unspecified library)

**Pattern stub:**
```tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
// Phase 1 stub: AuthGateSheet renders a modal overlay placeholder
// Phase 2: replace with @gorhom/bottom-sheet for proper bottom sheet UX

interface AuthGateSheetProps {
  visible: boolean;
  onClose: () => void;
}

export function AuthGateSheet({ visible, onClose }: AuthGateSheetProps) {
  const theme = useTheme();
  if (!visible) return null;

  return (
    <View style={{ /* overlay styles */ backgroundColor: theme.colors.surface }}>
      <Text style={{ color: theme.colors.textPrimary }}>Sign in to continue</Text>
      <TouchableOpacity onPress={onClose}>
        <Text style={{ color: theme.colors.accent }}>Close</Text>
      </TouchableOpacity>
    </View>
  );
}
```

**Notes:**
- Phase 1 delivers a functional (but unstyled) modal placeholder — behavior correct, visual polish in Phase 2
- D-05: user does NOT leave the current screen when this triggers; it is an overlay, not a navigation action
- `@gorhom/bottom-sheet` install: `npx expo install @gorhom/bottom-sheet react-native-gesture-handler react-native-reanimated`

---

### `frontend/.env.example` (config)

**Source:** RESEARCH.md Pattern 13

**Full file:**
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

**Notes:**
- Only `EXPO_PUBLIC_` prefixed vars here — these are safe to expose at build time
- `CLOUDINARY_API_SECRET` lives only in backend `.env` — never in frontend `.env` (security)

---

## Shared Patterns

### Theme Access (ALL frontend components)

**Rule:** Every component file that touches color, font, or spacing MUST use `useTheme()`.

**Apply to:** `HomeScreen.tsx`, `CreateScreen.tsx`, `ProfileScreen.tsx`, `AuthGateSheet.tsx`, `RootNavigator.tsx`, and all future components.

```typescript
const theme = useTheme();
// Then: theme.colors.background, theme.typography.bodyLg, theme.spacing.md
```

**Anti-pattern to avoid:**
```typescript
// WRONG — hardcoded hex in component
<View style={{ backgroundColor: '#1e0f11' }}>
// CORRECT
<View style={{ backgroundColor: theme.colors.background }}>
```

---

### Dependency Injection (ALL backend route handlers)

**Apply to:** `auth/routes.py`, `listings/routes.py`, `users/routes.py`, `upload/routes.py`

```python
from fastapi import Depends
from sqlmodel import Session
from app.database import get_db
from app.config import get_settings

@router.get("/example")
async def example_handler(
    db: Session = Depends(get_db),
    settings = Depends(get_settings),
):
    ...
```

---

### Environment Variables

**Backend:** All config via `pydantic-settings BaseSettings`. Never `os.environ["KEY"]` in route handlers.

**Frontend:** All env vars accessed in RN code via `process.env.EXPO_PUBLIC_*`. Never bare `process.env.KEY` (will be undefined at runtime in Expo builds).

---

### No Hard Deletes

**Apply to:** All backend route handlers that modify listings.

- `status` field on `listings` table: `"active"` | `"sold"` | `"deleted"` (D-13)
- DELETE endpoints set `listing.status = "deleted"` — never `session.delete(listing)`
- Query filters always include `where listings.status != 'deleted'`

---

### Error Response Shape

**Apply to:** All backend route handlers.

FastAPI's default error shape is `{"detail": "message"}`. Stick with this for Phase 1. Do not introduce a custom error envelope until Phase 2 when the error surface is larger.

```python
from fastapi import HTTPException
raise HTTPException(status_code=404, detail="Listing not found")
```

---

## No Analog Found

All Phase 1 files are greenfield. The following files have no analog even in RESEARCH.md patterns and require executor judgment:

| File | Role | Data Flow | Reason |
|------|------|-----------|--------|
| `backend/app/listings/schemas.py` | model | request-response | Listing request/response shape not defined in RESEARCH.md; executor defines sensible Pydantic models |
| `backend/app/users/schemas.py` | model | request-response | Same — user profile schema not fully defined |
| `backend/app/users/models.py` | model | CRUD | Users domain references `auth/models.py`; executor decides whether to re-export or leave empty |
| `frontend/src/components/AuthGateSheet.tsx` | component | event-driven | Bottom sheet pattern — no analog; use `@gorhom/bottom-sheet` as per RESEARCH.md Open Question 2 |

---

## Pre-existing Files to Extend (Not Create Fresh)

The following config files will be created by scaffolding commands and should be **extended**, not replaced:

| File Created By | Command | What to Extend |
|-----------------|---------|----------------|
| `frontend/app.json` | `npx create-expo-app` | Set `name`, `slug`, `bundleIdentifier` (`com.revvbase.app`), `android.package`, `ios.bundleIdentifier` |
| `frontend/package.json` | `npx create-expo-app` | Add libraries via `npx expo install` and `npm install` — do not manually edit versions |
| `frontend/tsconfig.json` | `npx create-expo-app` | Add path aliases if needed; otherwise leave as Expo default |
| `backend/alembic.ini` | `alembic init` | Update `script_location` and `sqlalchemy.url` (or leave url blank — set via env var in `env.py`) |
| `backend/alembic/env.py` | `alembic init` | Replace with GeoAlchemy2-aware version from RESEARCH.md Pattern 5 |

---

## Metadata

**Analog search scope:** Entire repository (`D:/Projects/revvbase-app/main/revvbase-app`)
**Source files scanned:** 10 planning/design documents; 0 source code files (none exist)
**Pattern sources:** RESEARCH.md (13 named patterns + code examples), CONTEXT.md (23 locked decisions), CLAUDE.md (stack conventions)
**Pattern extraction date:** 2026-05-04
**Valid until:** 2026-06-04 (matches RESEARCH.md validity window)
