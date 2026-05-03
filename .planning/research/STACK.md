# Stack Research

**Domain:** Mobile-first second-hand 2-wheeler marketplace (India)
**Researched:** 2026-05-03
**Confidence:** MEDIUM-HIGH (core stack confirmed via official docs; library versions from training data where WebFetch was blocked — flag for pre-build verification)

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended |
|------------|---------|---------|-----------------|
| React Native | 0.85 | Cross-platform mobile (Android + iOS) | Latest stable; New Architecture is on by default from 0.76+; Expo recommended by official RN docs as the primary way to build |
| Expo SDK | 52+ (managed workflow, ejectable) | Build tooling, OTA updates, native modules | Official RN recommendation; Expo SDK 52 enables New Architecture by default; avoids manual native config for MVP |
| FastAPI | 0.115+ (pin to latest stable pre-Starlette 1.0 if Railway doesn't support it yet) | REST API backend | Python ecosystem for future AI/OCR work; auto-generated OpenAPI docs; async-first; fastest Python framework for I/O-bound workloads |
| PostgreSQL | 15+ | Primary datastore | Relational model suits structured vehicle data; PostGIS extension available for future geo search; well-supported on Railway |
| SQLModel | 0.0.21+ | ORM / schema definition | Officially recommended by FastAPI docs; built on SQLAlchemy + Pydantic; single model definition for DB and API validation; avoids maintaining separate Pydantic schemas and SQLAlchemy models |
| Alembic | 1.13+ | Database migrations | De-facto standard for SQLAlchemy-based projects; SQLModel uses Alembic under the hood |
| Cloudinary | Python SDK `cloudinary` 1.x | Image storage, CDN, transforms | Replaces S3 + CDN + image resize pipeline; free tier handles MVP volume; FastAPI receives `UploadFile`, passes `file.file` directly to `cloudinary.uploader.upload()` |
| MSG91 | REST API (HTTP) | Phone OTP for auth | Indian provider; no SDK needed — plain `httpx` calls to MSG91's send/verify OTP endpoints; familiar auth pattern for Indian users (like WhatsApp, Paytm) |
| Railway | Hosted platform | FastAPI service + PostgreSQL | < $20/month at MVP scale on Hobby plan; one-command deploy; no Kubernetes/ECS complexity; supports environment variables, persistent Postgres volumes |

---

### Supporting Libraries — Frontend (React Native / Expo)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@react-navigation/native` + `@react-navigation/native-stack` | 7.x | Screen navigation | React Navigation 7 is the current standard; native-stack uses native NavigationController/Activity — correct for New Architecture |
| `@tanstack/react-query` (TanStack Query) | 5.x | Server state management (listings feed, detail page, mutations) | Handles caching, background refetch, pagination, and optimistic updates for listing CRUD; avoids hand-rolling useEffect + loading state; works in React Native without changes |
| `zustand` | 4.x | Lightweight client state (auth token, user session, UI state) | ~1 KB; no boilerplate; works with New Architecture; use for local ephemeral state that doesn't belong in server state (auth session, form draft) |
| `expo-image-picker` | SDK-versioned | Photo selection from camera roll or camera | Returns `uri`, `base64` optional, `mimeType`; supports multiple image selection for listing photos; New Architecture compatible |
| `expo-image` | SDK-versioned | Performant image rendering | Replaces `<Image>` from RN core; built-in blurhash placeholders, resize, caching; critical for listing cards with multiple photos |
| `expo-secure-store` | SDK-versioned | JWT token storage | Stores auth token in iOS Keychain / Android Keystore; never use AsyncStorage for tokens |
| `expo-camera` | SDK-versioned | In-app camera capture | For listing photo flow where user takes photos directly (not just selects from gallery) |
| `@shopify/flash-list` | 1.x | High-performance listing feed | Replaces `FlatList` for the home screen grid; Shopify-built, New Architecture support confirmed, significantly better scroll perf for large item lists |
| `react-hook-form` | 7.x | Form state and validation | Listing create/edit form has ~12 fields; react-hook-form avoids re-renders on every keystroke vs. controlled components; pairs well with `zod` for schema validation |
| `zod` | 3.x | Schema validation | Shared validation between form (client) and can mirror API validation logic; catches bad input before it hits the server |
| `axios` or `ky` | axios 1.x / ky 1.x | HTTP client | TanStack Query needs a fetcher function; axios is battle-tested for React Native with interceptors for token injection; ky is lighter — either works |

---

### Supporting Libraries — Backend (FastAPI / Python)

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `pydantic` | 2.9+ | Request/response validation, settings management | Required by FastAPI 0.115+; use `BaseSettings` for config (Railway env vars); use `model_validator` for listing field constraints |
| `python-jose` or `PyJWT` | PyJWT 2.x | JWT encode/decode | FastAPI docs use PyJWT with HS256; `python-jose` also common but slower; for OTP-to-JWT flow: verify OTP with MSG91, issue JWT on success |
| `pwdlib[argon2]` | 0.2+ | Password hashing (if passwords needed) | FastAPI officially recommends pwdlib with Argon2; for this project passwords are not needed (OTP-only auth) — include only if admin panel is added |
| `httpx` | 0.27+ | Async HTTP client for MSG91 API calls | Use `httpx.AsyncClient` inside FastAPI route to call MSG91's OTP send/verify endpoints; non-blocking; also used for testing FastAPI with `TestClient` |
| `python-multipart` | 0.0.9+ | Parse multipart form data for file uploads | Required by FastAPI to handle `UploadFile`; must be installed explicitly |
| `cloudinary` | 1.x | Upload images to Cloudinary from FastAPI | `cloudinary.uploader.upload(file.file)` — pass the SpooledTemporaryFile directly; returns `secure_url` and `public_id` to store in DB |
| `alembic` | 1.13+ | DB migrations | Separate from SQLModel; run `alembic upgrade head` on deploy; required for production schema evolution |
| `psycopg2-binary` or `asyncpg` | psycopg2-binary 2.9+ | PostgreSQL driver | SQLModel (sync) uses psycopg2; if async SQLAlchemy is added later, switch to asyncpg; for MVP sync is fine — FastAPI handles concurrency via async route + threadpool |
| `python-dotenv` | 1.x | Load `.env` locally | Railway injects env vars in production; locally use `.env` + `python-dotenv`; Pydantic `BaseSettings` reads both transparently |
| `uvicorn[standard]` | 0.30+ | ASGI server | Run FastAPI in production; `[standard]` includes uvloop (faster event loop on Linux) and websockets support for future messaging |

---

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Expo Go / Expo Dev Client | Local mobile testing | Use Expo Go for early development; switch to Dev Client (custom native build) when adding native modules that Go doesn't support |
| EAS (Expo Application Services) | Cloud builds + OTA updates | For production builds (`.apk`/`.aab`/`.ipa`); EAS Update for OTA JS patches without app store submission |
| Ruff | Python linter + formatter | Replaces flake8 + black + isort; fast, single tool; configure in `pyproject.toml` |
| pytest + httpx | Backend testing | `httpx.AsyncClient` as the test client for FastAPI; pytest-asyncio for async test support |
| Jest + Testing Library | Frontend unit tests | Expo configures Jest out of the box; `@testing-library/react-native` for component tests |
| Railway CLI | Deploy from terminal | `railway up` deploys; `railway logs` streams; `railway run` for local env injection |

---

## Installation

### Frontend

```bash
# Scaffold
npx create-expo-app@latest revvbase-mobile --template blank-typescript

# Navigation
npx expo install @react-navigation/native @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Data fetching & state
npx expo install @tanstack/react-query zustand

# Image handling
npx expo install expo-image-picker expo-image expo-camera

# Auth storage
npx expo install expo-secure-store

# Performance list
npx expo install @shopify/flash-list

# Forms & validation
npm install react-hook-form zod @hookform/resolvers

# HTTP
npm install axios
```

### Backend

```bash
# Core
pip install fastapi "uvicorn[standard]" sqlmodel alembic psycopg2-binary

# Auth
pip install pyjwt httpx

# File upload & images
pip install python-multipart cloudinary

# Config & validation
pip install pydantic-settings python-dotenv

# Dev tools
pip install ruff pytest pytest-asyncio
```

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| Navigation | React Navigation 7 (native-stack) | Expo Router (file-based) | Expo Router is excellent but adds complexity for a team controlling screens manually; file-based routing mental model differs from screen-flow thinking; can migrate later |
| State (server) | TanStack Query | SWR | TanStack Query has better RN support, more features (mutations, optimistic updates, pagination), and is the community standard in 2025 |
| State (client) | Zustand | Redux Toolkit | RTK is 10x the boilerplate for what is needed here — auth token + session; Zustand achieves same result in ~15 lines |
| ORM | SQLModel | Pure SQLAlchemy | SQLModel reduces schema duplication (one model = DB table + Pydantic validator); FastAPI creator recommends it; SQLAlchemy directly is fine but more verbose |
| ORM | SQLModel | Tortoise ORM | Tortoise is async-native but less mature, fewer PostGIS integrations, smaller community |
| Image list | FlashList | FlatList (built-in) | FlatList has known perf issues on large lists (no window-based recycling by default); FlashList is a drop-in replacement with dramatically better scroll performance for listing feeds |
| Image hosting | Cloudinary | S3 + CloudFront | S3 requires Lambda/worker for transforms, CloudFront config, separate CDN setup — 3x complexity for same outcome; Cloudinary free tier covers MVP |
| Task queue | FastAPI BackgroundTasks | Celery + Redis | Celery adds two infrastructure components (broker + worker); FastAPI's built-in `BackgroundTasks` handles OTP expiry cleanup and lightweight async ops; upgrade to Celery if processing times exceed 10 seconds |
| Auth | OTP-only (MSG91) | Firebase Auth / Supabase Auth | Firebase couples the project to Google infra; Supabase Auth is heavier than needed; MSG91 is the known Indian production choice, cheap, and keeps auth in-house |
| Deployment | Railway | AWS ECS / Render | AWS requires DevOps expertise before PMF; Render is a viable alternative at similar cost; Railway chosen for DX and Railway's native PostgreSQL |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| `AsyncStorage` for JWT tokens | Unencrypted storage — tokens can be extracted on rooted devices; security anti-pattern | `expo-secure-store` (Keychain / Keystore) |
| `FlatList` for the listings feed | Known performance ceiling; drops frames with large lists and image-heavy cards | `@shopify/flash-list` |
| Redux (full) for this app | Overkill; increases bundle size and dev velocity cost; 80% of Redux usage is server state that TanStack Query owns better | TanStack Query (server state) + Zustand (client state) |
| Celery + Redis for MVP | Adds two infrastructure services and $10-15/month on Railway before product-market fit | FastAPI `BackgroundTasks` for lightweight async (OTP expiry, notifications) |
| `python-jose` | Stale package, last major update 2022, known CVEs in some versions | `PyJWT` 2.x (actively maintained, FastAPI docs recommend it) |
| Direct Cloudinary upload from mobile (unsigned) | Exposes API key in mobile bundle; anyone can upload arbitrary files to your Cloudinary account | Route uploads through FastAPI backend (mobile → FastAPI → Cloudinary); or use Cloudinary signed upload presets if direct mobile upload is needed in future |
| Multiple Expo SDK major version mismatches | Expo SDK packages are versioned together; mixing versions causes incompatible native module errors | Always use `npx expo install` (not `npm install`) for Expo SDK packages — it pins the correct version |
| `python-multipart` omission | FastAPI silently fails to parse form data / file uploads without it — a common "why doesn't upload work" bug | Always include `python-multipart` in requirements when using `UploadFile` |
| Synchronous Cloudinary upload in async FastAPI route | Blocks the event loop during file upload; degrades concurrency | Use `asyncio.get_event_loop().run_in_executor()` to wrap the sync `cloudinary.uploader.upload()` call, or offload to `BackgroundTasks` |

---

## Key Integration Patterns

### MSG91 OTP Flow (FastAPI)

MSG91 exposes a REST API — no Python SDK needed.

```
POST /auth/send-otp
  → httpx.post("https://api.msg91.com/api/v5/otp", params={authkey, mobile, template_id})
  → Store {mobile, otp_ref_id, expires_at} in a temporary DB table (or in-memory for MVP)
  → Return 200 OK (never return the OTP itself)

POST /auth/verify-otp
  → httpx.post("https://api.msg91.com/api/v5/otp/verify", params={authkey, mobile, otp})
  → On success: upsert User(phone=mobile), issue JWT (PyJWT, HS256, 30-day expiry for mobile)
  → Return {access_token, token_type: "bearer"}

All subsequent requests:
  → Mobile sends Authorization: Bearer <token>
  → FastAPI dependency get_current_user() decodes JWT, returns User
```

Key implementation note: store OTP state server-side (not just relying on MSG91) — MSG91's verify endpoint is the source of truth but you need a short-lived record to rate-limit re-sends (max 3 per hour per phone number).

### Cloudinary Upload Flow (FastAPI + React Native)

```
Mobile:
  → expo-image-picker returns local file URI
  → Create FormData with the file
  → POST /listings/{id}/photos with multipart/form-data

FastAPI:
  → Receive UploadFile (python-multipart required)
  → asyncio.get_event_loop().run_in_executor(None, cloudinary.uploader.upload, file.file)
  → Store returned secure_url and public_id in ListingPhoto table
  → Return photo URL to mobile

Cloudinary transforms (use URL parameters, no extra code):
  → Thumbnail: append /w_400,h_300,c_fill/ to secure_url
  → Full view: serve secure_url as-is
```

### PostgreSQL Schema Considerations

```sql
-- PostGIS-ready from day 1 (even if not used in MVP)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users table (OTP-only auth — no password column)
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) UNIQUE NOT NULL,  -- E.164 format: +919876543210
    created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Listings table
CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID REFERENCES users(id) ON DELETE CASCADE,
    vehicle_type    VARCHAR(20) NOT NULL,   -- motorcycle, scooter, ev, bicycle
    make            VARCHAR(50) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    year            SMALLINT NOT NULL,
    odometer_km     INTEGER,
    price           INTEGER NOT NULL,       -- INR, no decimals
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    location        GEOGRAPHY(POINT, 4326), -- PostGIS; NULL for MVP, fill later
    fuel_type       VARCHAR(20),            -- petrol, electric, diesel, na
    prev_owners     SMALLINT DEFAULT 0,
    insurance_valid DATE,
    description     TEXT,
    status          VARCHAR(20) DEFAULT 'active',  -- active, sold, deleted
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Photos table (1:many per listing, ordered)
CREATE TABLE listing_photos (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id      UUID REFERENCES listings(id) ON DELETE CASCADE,
    cloudinary_url  TEXT NOT NULL,
    public_id       TEXT NOT NULL,         -- for Cloudinary delete/replace
    sort_order      SMALLINT DEFAULT 0,    -- 0 = cover photo
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- OTP rate-limiting table (short-lived, cleanup via BackgroundTasks)
CREATE TABLE otp_requests (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) NOT NULL,
    sent_at     TIMESTAMPTZ DEFAULT NOW(),
    expires_at  TIMESTAMPTZ NOT NULL
);

-- Indexes for MVP query patterns
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_seller ON listings(seller_id);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_vehicle_type ON listings(vehicle_type);
CREATE INDEX idx_listing_photos_listing ON listing_photos(listing_id, sort_order);
-- PostGIS spatial index (future use)
CREATE INDEX idx_listings_location ON listings USING GIST(location);
```

Key decisions:
- `price` as INTEGER (INR, paise not needed for used vehicles)
- `location GEOGRAPHY` column present but nullable — fills when PostGIS search is built
- `status` field on listings avoids hard deletes — soft-delete pattern
- `sort_order` on photos so first photo is always the cover card image
- UUIDs everywhere — avoids enumerable IDs on public API

---

## Version Compatibility

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| FastAPI 0.115+ | Pydantic 2.9+, Starlette 0.41+ | FastAPI 0.136+ requires Starlette 1.0 — check Railway's Python version supports it |
| SQLModel 0.0.21+ | SQLAlchemy 2.x, Pydantic 2.x | SQLModel 0.0.14+ required for Pydantic v2 compat; do not use <0.0.14 |
| Expo SDK 52+ | React Native 0.76+ | New Architecture on by default from Expo SDK 52 / RN 0.76 |
| React Navigation 7.x | React Native 0.73+ | Requires `react-native-screens` 3.x and `react-native-safe-area-context` 4.x |
| @shopify/flash-list 1.x | React Native 0.70+, New Architecture | Verified New Architecture compatible per Shopify |
| PyJWT 2.x | Python 3.8+ | Do NOT use PyJWT 1.x — breaking API differences |
| cloudinary Python SDK 1.x | Python 3.6+ | Upload is synchronous — must wrap in executor inside async FastAPI routes |

---

## Stack Patterns by Variant

**If Expo Go is sufficient (pre-native-module phase):**
- Use managed Expo workflow throughout MVP
- All libraries above are Expo Go compatible
- No need for `expo prebuild` or EAS Build until a native module is required

**If direct mobile-to-Cloudinary upload is needed (future, skip for MVP):**
- Use Cloudinary's signed upload presets
- Generate a short-lived signature on the FastAPI backend (`/upload-signature` endpoint)
- Mobile POSTs directly to Cloudinary's upload URL with the signature
- This avoids routing large image bytes through the FastAPI server
- For MVP, backend proxy is simpler and sufficient

**If PostGIS search is needed (v2):**
- Enable PostGIS extension on Railway PostgreSQL (`CREATE EXTENSION postgis`)
- Add `geoalchemy2` Python package
- The `location GEOGRAPHY` column is already in the schema — no migration needed beyond populating it
- Use `ST_DWithin()` for radius queries

**If Celery is needed (post-MVP, heavy background jobs):**
- Add Redis service on Railway (~$5/month)
- Replace `BackgroundTasks` with `celery.delay()`
- Maintain same task function signatures — migration is low effort if tasks are already isolated

---

## Sources

- `https://reactnative.dev/docs/environment-setup` — Confirmed RN 0.85 stable, Expo recommended by official RN docs (HIGH confidence)
- `https://reactnative.dev/blog/2024/10/23/the-new-architecture-is-here` — New Architecture library compatibility status, 850+ libs compatible (HIGH confidence)
- `https://fastapi.tiangolo.com/tutorial/sql-databases/` — SQLModel as officially recommended ORM for FastAPI (HIGH confidence)
- `https://fastapi.tiangolo.com/release-notes/` — FastAPI 0.115-0.136 release history, Pydantic 2.9+ requirement (HIGH confidence)
- `https://fastapi.tiangolo.com/tutorial/security/oauth2-jwt/` — PyJWT + pwdlib recommended, HS256 pattern (HIGH confidence)
- `https://fastapi.tiangolo.com/tutorial/request-files/` — UploadFile pattern, direct pass to Cloudinary SDK (HIGH confidence)
- `https://fastapi.tiangolo.com/tutorial/background-tasks/` — BackgroundTasks sufficient for MVP OTP cleanup (HIGH confidence)
- `https://fastapi.tiangolo.com/tutorial/bigger-applications/` — APIRouter + prefix + tags modular pattern (HIGH confidence)
- React Navigation 7.x, TanStack Query 5.x, Zustand 4.x, FlashList 1.x — confirmed versions from training data (MEDIUM confidence — verify current patch versions before build)
- MSG91 OTP REST API — widely documented in Indian developer community; send/verify via HTTPS POST; no Python SDK needed (MEDIUM confidence — verify exact endpoint URLs from MSG91 docs before implementation)
- Railway pricing ($5/month Hobby plan) — from training data (LOW confidence — verify current pricing at railway.app before budgeting)
- Cloudinary free tier (25 GB storage, 25 GB bandwidth/month) — from training data (MEDIUM confidence — verify current free tier limits at cloudinary.com)

---

*Stack research for: Revvbase — second-hand 2-wheeler marketplace (India)*
*Researched: 2026-05-03*
