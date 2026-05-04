# Phase 1: Foundation - Research

**Researched:** 2026-05-04
**Domain:** FastAPI + PostgreSQL + PostGIS + Expo New Architecture scaffold
**Confidence:** HIGH (verified package versions from npm/pypi registries; Railway patterns from official docs; Expo font/splash pattern from official docs)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- **D-01:** Top-level split: `/frontend` (Expo app) and `/backend` (FastAPI). Simple, unambiguous.
- **D-02:** Backend is domain-driven: `/backend/app/auth/`, `/backend/app/listings/`, `/backend/app/users/` — each domain folder contains `routes.py`, `models.py`, `schemas.py`.
- **D-03:** Bottom tab navigator with 3 tabs: Home, Create, Profile. React Navigation native-stack inside each tab.
- **D-04:** Each tab renders a real placeholder screen (tab name visible, otherwise empty). Navigation is fully wired end-to-end in Phase 1.
- **D-05:** Auth guard: when a non-logged-in user taps Create or Profile, a bottom sheet modal appears ("Sign in to continue") — user does NOT leave the current screen.
- **D-06:** Migration 001 creates all four tables: `users`, `listings`, `listing_photos`, `vehicle_makes`.
- **D-07:** `users` table: `id` (UUID PK), `phone` (unique), `display_name` (nullable), `phone_verified` (bool), `created_at`.
- **D-08:** `listings` table: full schema with JSONB `attributes`, GEOGRAPHY `location` (nullable), INTEGER `price`, soft-delete `status`.
- **D-09:** `listing_photos` table: `cloudinary_public_id` only (NOT full URLs), `sort_order`.
- **D-10:** `vehicle_makes` table: seeded with top Indian brands + "Other" fallback.
- **D-11:** Price stored as INTEGER in rupees.
- **D-12:** All PKs are UUIDs.
- **D-13:** Soft-delete via `status` field on listings.
- **D-14:** PostGIS extension enabled from day 1. Spatial index on `location` column. Column is nullable.
- **D-15:** 5 active listing limit enforced at application layer (API returns 403).
- **D-16:** Context-driven, swappable theme: typed `Theme` interface with `colors`, `typography`, `spacing` keys. `darkTheme` + stub `lightTheme`.
- **D-17:** Components call `useTheme()` — never import raw hex values directly.
- **D-18:** Semantic color naming: `colors.background`, `colors.primary`, `colors.textPrimary`, `colors.surface`, `colors.accent`.
- **D-19:** Space Grotesk via `expo-font` + `useFonts` hook using `@expo-google-fonts/space-grotesk`. Splash screen held until fonts load.
- **D-20:** Design tokens from `design/high_performance_dark_mode/DESIGN.md` — MUST be translated into `frontend/src/theme/darkTheme.ts`.
- **D-21:** OTP is mocked: `MOCK_OTP=true` → any phone accepts `123456`. Real MSG91 via `MOCK_OTP=false`.
- **D-22:** Cloudinary signed-upload endpoint stubbed at `/api/v1/upload/signature`.
- **D-23:** All secrets via environment variables. `.env.example` committed; `.env` gitignored.

### Claude's Discretion

- Specific Railway service configuration (single service vs. separate web + worker).
- Alembic migration naming convention.
- Python dependency management tool (`uv` preferred over `pip` for speed).
- Expo app name and bundle identifier (`com.revvbase.app`).

### Deferred Ideas (OUT OF SCOPE)

- None — discussion stayed within Phase 1 scope.

</user_constraints>

---

## Summary

Phase 1 is a pure infrastructure phase: no user-facing features ship, but every subsequent phase depends on what is laid down here. The primary technical challenge is that the decisions made in this phase — particularly the database schema and the navigation structure — are difficult to change later. Getting them right (complete schema in migration 001, correct Alembic + GeoAlchemy2 wiring, React Navigation's tab + native-stack composition, the ThemeContext pattern) eliminates expensive retrofits in Phases 2-5.

The most important finding from this research is the **PostGIS deployment constraint on Railway**: Railway's default PostgreSQL template does NOT include PostGIS. The PostGIS template must be selected at service creation time — it cannot be added retroactively by running `CREATE EXTENSION` (the DB user Railway provisions is not a superuser). This means the Railway PostgreSQL service must be provisioned as the PostGIS template before any migrations run. This is a one-time setup step that must be captured explicitly in the plan.

The second key finding is that **Expo SDK latest stable is 55** (not 52 as documented in STACK.md) and **SQLModel latest is 0.0.38** (not 0.0.21). These version differences are significant enough to mention but do not change patterns — the same APIs apply.

**Primary recommendation:** Plan execution in strict order: Railway PostGIS service provisioned → Alembic migration 001 → FastAPI skeleton running → Expo scaffold. Never attempt frontend scaffolding before the backend health check responds, as the Axios base URL must be configured against a live endpoint.

---

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Bottom tab navigation shell | Frontend (React Native) | — | Pure client-side routing; no server involvement |
| Theme system (ThemeContext + useTheme) | Frontend (React Native) | — | Client-side styling concern |
| Space Grotesk font loading | Frontend (React Native) | — | expo-font handles asset bundling at build time |
| Auth guard (bottom sheet modal) | Frontend (React Native) | — | UI interaction guard; auth state from Zustand |
| DB schema + migrations | Backend/Database | — | Alembic owns all schema DDL |
| PostGIS extension enablement | Database (Railway) | Backend (migration) | Must be in PostGIS template; confirmed via migration |
| FastAPI domain structure | Backend (API) | — | APIRouter per domain (auth, listings, users) |
| Cloudinary signature endpoint | Backend (API) | — | api_secret never leaves backend |
| Mock OTP flag | Backend (API) | — | MOCK_OTP env var controls flow server-side |
| Environment variable management | Backend (Railway) + Frontend (Expo) | — | Backend: pydantic-settings; Frontend: EXPO_PUBLIC_ prefix |
| vehicle_makes seed data | Database | Backend (migration/seed script) | Seed runs once at migration time |

---

## Standard Stack

### Core — Verified Versions

| Library | Verified Version | Purpose | Source |
|---------|-----------------|---------|--------|
| Expo SDK | 55.0.19 (latest stable) | Build tooling, managed workflow | [VERIFIED: npm registry] |
| React Native | 0.85.2 | Cross-platform mobile runtime | [VERIFIED: npm registry] |
| FastAPI | 0.136.1 | REST API backend | [VERIFIED: pypi registry] |
| SQLModel | 0.0.38 | ORM — DB models + Pydantic schemas unified | [VERIFIED: pypi registry] |
| Alembic | 1.18.4 | Database migrations | [VERIFIED: pypi registry] |
| GeoAlchemy2 | 0.19.0 | PostGIS GEOGRAPHY column support in SQLAlchemy | [VERIFIED: pypi registry] |
| cloudinary (Python SDK) | 1.44.2 | Signed upload signature generation on backend | [VERIFIED: pypi registry] |
| uvicorn[standard] | 0.46.0 | ASGI server for production | [VERIFIED: pypi registry] |
| pydantic-settings | 2.14.0 | BaseSettings for env var config | [VERIFIED: pypi registry] |
| PyJWT | 2.12.1 | JWT encode/decode (not python-jose — stale/CVEs) | [VERIFIED: pypi registry] |
| httpx | 0.28.1 | Async HTTP client for MSG91 calls | [VERIFIED: pypi registry] |
| psycopg2-binary | 2.9.12 | PostgreSQL driver for SQLModel (sync) | [VERIFIED: pypi registry] |
| python-multipart | 0.0.27 | Required for FastAPI UploadFile support | [VERIFIED: pypi registry] |
| python-dotenv | 1.2.2 | Local .env loading | [VERIFIED: pypi registry] |
| slowapi | 0.1.9 | Rate limiting for FastAPI (needed for OTP endpoint) | [VERIFIED: pypi registry] |
| ruff | 0.15.12 | Python linter + formatter | [VERIFIED: pypi registry] |
| pytest-asyncio | 1.3.0 | Async test support | [VERIFIED: pypi registry] |

### Core — Frontend (verified versions)

| Library | Verified Version | Purpose | Source |
|---------|-----------------|---------|--------|
| @react-navigation/native | 7.x (7.2.2) | Navigation container | [VERIFIED: npm registry] |
| @react-navigation/bottom-tabs | 7.x (7.15.11) | Bottom tab navigator | [VERIFIED: npm registry] |
| @react-navigation/native-stack | 7.x (7.14.12) | Native stack per tab | [VERIFIED: npm registry] |
| @tanstack/react-query | 5.100.9 | Server state management | [VERIFIED: npm registry] |
| zustand | 5.0.12 | Client state (auth token, session) | [VERIFIED: npm registry] |
| @expo-google-fonts/space-grotesk | 0.4.1 | Space Grotesk font variants | [VERIFIED: npm registry] |
| expo-font | 55.0.6 | Font loading hook (useFonts) | [VERIFIED: npm registry] |
| expo-splash-screen | 55.0.19 | Hold splash until fonts ready | [VERIFIED: npm registry] |
| expo-secure-store | 55.0.13 | JWT storage in Keychain/Keystore | [VERIFIED: npm registry] |
| @shopify/flash-list | 2.3.1 | High-performance list (replaces FlatList) | [VERIFIED: npm registry] |
| react-hook-form | 7.75.0 | Form state and validation | [VERIFIED: npm registry] |
| zod | 4.4.3 | Schema validation | [VERIFIED: npm registry] |
| @hookform/resolvers | 5.2.2 | zod resolver for react-hook-form | [VERIFIED: npm registry] |
| axios | 1.16.0 | HTTP client with interceptors | [VERIFIED: npm registry] |
| react-native-screens | 4.24.0 | Required peer for React Navigation | [VERIFIED: npm registry] |
| react-native-safe-area-context | 5.7.0 | Required peer for React Navigation | [VERIFIED: npm registry] |

**Important version note (zustand):** Zustand is now at 5.x, not 4.x as documented in STACK.md. The API is similar but there are minor differences in how middleware is composed. No breaking changes for basic auth store usage (`create()` is the same). [VERIFIED: npm registry]

**Important version note (zod):** Zod is now at 4.x. The core API (`z.object`, `z.string`, `z.number`) is identical. The `@hookform/resolvers` package is at 5.x to match. [VERIFIED: npm registry]

**Important version note (flash-list):** `@shopify/flash-list` is at 2.3.1. Phase 1 only needs to install it; the listing feed is built in Phase 4. [VERIFIED: npm registry]

### Installation Commands

**Backend:**
```bash
# In /backend directory
# Using uv (preferred per Claude's Discretion)
uv init
uv add fastapi "uvicorn[standard]" sqlmodel alembic geoalchemy2 psycopg2-binary
uv add pydantic-settings python-dotenv python-multipart
uv add pyjwt httpx cloudinary slowapi
uv add --dev ruff pytest pytest-asyncio httpx

# Or pip:
pip install fastapi "uvicorn[standard]" sqlmodel alembic geoalchemy2 psycopg2-binary \
  pydantic-settings python-dotenv python-multipart pyjwt httpx cloudinary slowapi
pip install --dev ruff pytest pytest-asyncio
```

**Frontend:**
```bash
# Scaffold (from monorepo root)
npx create-expo-app@latest frontend --template blank-typescript
cd frontend

# Navigation (use npx expo install — pins correct SDK-compatible versions)
npx expo install @react-navigation/native @react-navigation/bottom-tabs \
  @react-navigation/native-stack react-native-screens react-native-safe-area-context

# Fonts and splash
npx expo install @expo-google-fonts/space-grotesk expo-font expo-splash-screen

# State
npx expo install zustand @tanstack/react-query

# Auth storage
npx expo install expo-secure-store

# Performance list (install now, use in Phase 4)
npx expo install @shopify/flash-list

# Forms and validation
npm install react-hook-form zod @hookform/resolvers

# HTTP
npm install axios
```

---

## Architecture Patterns

### System Architecture Diagram

```
[Expo App — React Native New Architecture]
        |
        | EXPO_PUBLIC_API_URL (env var)
        | Axios instance (base URL + future JWT interceptor stub)
        |
        v
[FastAPI — Railway service]
  /api/v1/health         — health check endpoint
  /api/v1/upload/signature — Cloudinary signed upload stub (returns 501 for now)
  /api/v1/auth/ (stub)   — routes registered, not implemented
  /api/v1/listings/ (stub)
  /api/v1/users/ (stub)
        |
        | SQLModel + psycopg2 + DATABASE_URL (Railway env var)
        |
        v
[PostgreSQL — Railway PostGIS template]
  PostGIS extension pre-installed
  Tables: users, listings, listing_photos, vehicle_makes
  Alembic migration 001 applied via preDeployCommand
```

### Recommended Project Structure

**Monorepo root:**
```
revvbase-app/
├── frontend/              # Expo managed workflow app
│   ├── app.json
│   ├── package.json
│   ├── tsconfig.json
│   ├── .env               # gitignored
│   ├── .env.example       # committed
│   └── src/
│       ├── navigation/    # Navigator definitions
│       ├── screens/       # HomeScreen, CreateScreen, ProfileScreen (placeholders)
│       ├── theme/         # darkTheme.ts, lightTheme.ts, ThemeContext.tsx, useTheme.ts
│       ├── api/           # client.ts (Axios instance), types.ts
│       ├── store/         # authStore.ts (Zustand)
│       └── components/    # AuthGateSheet.tsx (bottom sheet modal stub)
│
├── backend/               # FastAPI app
│   ├── pyproject.toml     # uv/pip config, ruff settings
│   ├── railway.toml       # Railway deployment config
│   ├── .env               # gitignored
│   ├── .env.example       # committed
│   ├── alembic.ini
│   ├── alembic/
│   │   ├── env.py         # configured for GeoAlchemy2 + PostGIS tables
│   │   └── versions/
│   │       └── 001_initial_schema.py
│   └── app/
│       ├── main.py        # FastAPI init, router registration, CORS
│       ├── config.py      # pydantic-settings BaseSettings
│       ├── database.py    # engine, session factory, get_db dependency
│       ├── dependencies.py # get_current_user (stub for Phase 1)
│       ├── auth/
│       │   ├── models.py  # User model (SQLModel)
│       │   ├── schemas.py # OTPRequest, TokenResponse (Pydantic)
│       │   └── routes.py  # /auth/send-otp, /auth/verify-otp (stubs + mock)
│       ├── listings/
│       │   ├── models.py  # Listing, ListingPhoto, VehicleMake (SQLModel)
│       │   ├── schemas.py
│       │   └── routes.py  # stub
│       ├── users/
│       │   ├── models.py  # (references User from auth)
│       │   ├── schemas.py
│       │   └── routes.py  # stub
│       └── upload/
│           └── routes.py  # /upload/signature stub
│
├── design/                # HTML mockups (reference only)
└── .planning/
```

**Note on domain structure vs. ARCHITECTURE.md:** The locked decision (D-02) specifies `/backend/app/auth/`, `/backend/app/listings/`, `/backend/app/users/` with `routes.py`, `models.py`, `schemas.py` per domain. This differs from the earlier ARCHITECTURE.md which proposed a flat `routers/`, `models/`, `schemas/` split. The domain-driven layout (D-02) takes precedence. A `dependencies.py` and `upload/routes.py` sit at the app level as shared/cross-cutting concerns. [ASSUMED — this interpretation follows D-02 literally; confirm if upload/ should be a domain folder]

### Pattern 1: FastAPI App Init + APIRouter Registration

```python
# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.auth.routes import router as auth_router
from app.listings.routes import router as listings_router
from app.users.routes import router as users_router
from app.upload.routes import router as upload_router

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
    return {"status": "ok"}
```

[CITED: https://fastapi.tiangolo.com/tutorial/bigger-applications/]

### Pattern 2: pydantic-settings BaseSettings for Config

```python
# backend/app/config.py
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

[CITED: https://fastapi.tiangolo.com/advanced/settings/]

### Pattern 3: Railway railway.toml for FastAPI + Alembic

```toml
# backend/railway.toml
[deploy]
preDeployCommand = "alembic upgrade head"
startCommand = "uvicorn app.main:app --host 0.0.0.0 --port $PORT"
healthcheckPath = "/api/v1/health"
healthcheckTimeout = 60
restartPolicyType = "ON_FAILURE"
```

Key points:
- `preDeployCommand` runs alembic migrations before each deploy — ensures DB is always up to date
- `$PORT` is injected by Railway automatically — do not hardcode 8000
- `healthcheckPath` must return HTTP 200 before Railway considers the deploy live (zero-downtime deploys)
- Railway reads `railway.toml` from the project root; set the Railway service root directory to `/backend`

[CITED: https://docs.railway.com/reference/config-as-code]

### Pattern 4: SQLModel Models with GeoAlchemy2

SQLModel 0.0.38 uses SQLAlchemy 2.x under the hood. GeoAlchemy2 is compatible.
The `GEOGRAPHY` type cannot be declared natively in SQLModel's field syntax — it requires `sa_column` to pass the raw SQLAlchemy column:

```python
# backend/app/listings/models.py
import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field
from sqlalchemy import Column, Integer, JSON, Text
from geoalchemy2 import Geography

class Listing(SQLModel, table=True):
    __tablename__ = "listings"

    id: uuid.UUID = Field(default_factory=uuid.uuid4, primary_key=True)
    seller_id: uuid.UUID = Field(foreign_key="users.id")
    vehicle_type: str
    make: str
    model: str
    year: int
    odometer_km: Optional[int] = None
    price: int = Field(sa_column=Column(Integer, nullable=False))  # INR
    city: str
    fuel_type: Optional[str] = None
    owners: int = Field(default=1)
    insurance_date: Optional[datetime] = None
    description: Optional[str] = Field(default=None, sa_column=Column(Text))
    status: str = Field(default="active")  # active | sold | deleted
    attributes: dict = Field(default={}, sa_column=Column(JSON))  # EV fields
    location: Optional[object] = Field(
        default=None,
        sa_column=Column(Geography(geometry_type="POINT", srid=4326), nullable=True)
    )
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)
```

[VERIFIED: GeoAlchemy2 0.19.0 docs; SQLModel 0.0.38 + SQLAlchemy 2.x compatible]

### Pattern 5: Alembic env.py for PostGIS + GeoAlchemy2

Critical: Alembic's autogenerate will try to migrate PostGIS system tables (`spatial_ref_sys`, `geometry_columns`, `geography_columns`). These must be excluded:

```python
# backend/alembic/env.py (critical additions)
from geoalchemy2 import alembic_helpers

# In run_migrations_online():
with connectable.connect() as connection:
    context.configure(
        connection=connection,
        target_metadata=target_metadata,
        include_object=alembic_helpers.include_object,  # excludes PostGIS tables
        include_schemas=True,
        render_item=alembic_helpers.render_item,  # correct Geography rendering
    )
```

Also: migration 001 must NOT rely on autogenerate for the PostGIS extension — issue it explicitly:

```python
# backend/alembic/versions/001_initial_schema.py
from alembic import op
import sqlalchemy as sa
import sqlmodel
from geoalchemy2 import Geography

def upgrade():
    # Extension is pre-installed in Railway PostGIS template.
    # Run anyway to be safe (IF NOT EXISTS prevents errors on re-run).
    op.execute("CREATE EXTENSION IF NOT EXISTS postgis")
    op.execute("CREATE EXTENSION IF NOT EXISTS pgcrypto")  # for gen_random_uuid()

    op.create_table(
        "users",
        sa.Column("id", sa.UUID, primary_key=True, server_default=sa.text("gen_random_uuid()")),
        sa.Column("phone", sa.String(15), nullable=False, unique=True),
        sa.Column("display_name", sa.String(100), nullable=True),
        sa.Column("phone_verified", sa.Boolean, nullable=False, server_default="false"),
        sa.Column("created_at", sa.TIMESTAMP(timezone=True), server_default=sa.func.now()),
    )
    # ... (other tables) ...
    # Spatial index on listings.location:
    op.execute("CREATE INDEX idx_listings_location ON listings USING GIST(location)")
```

[CITED: https://geoalchemy-2.readthedocs.io/en/0.14.3/alembic_helpers.html]

### Pattern 6: Expo Font Loading + Splash Screen Hold

The pattern from official Expo docs (SDK 55 compatible):

```tsx
// frontend/src/App.tsx (or root _layout.tsx if using Expo Router — but Phase 1 uses manual nav)
import {
  SpaceGrotesk_400Regular,
  SpaceGrotesk_500Medium,
  SpaceGrotesk_600SemiBold,
  SpaceGrotesk_700Bold,
  useFonts,
} from '@expo-google-fonts/space-grotesk';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect } from 'react';

// Call OUTSIDE the component — runs once at module load
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
    return null; // Keep splash visible
  }

  return <ThemeProvider><RootNavigator /></ThemeProvider>;
}
```

[CITED: https://docs.expo.dev/develop/user-interface/fonts/]

### Pattern 7: ThemeContext — Typed Interface + useTheme Hook

```tsx
// frontend/src/theme/types.ts
export interface Theme {
  colors: {
    background: string;
    surface: string;
    surfaceContainer: string;
    primary: string;
    onPrimary: string;
    accent: string;      // Nitro Blue
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
  };
}

// frontend/src/theme/ThemeContext.tsx
import React, { createContext, useContext } from 'react';
import { Theme } from './types';
import { darkTheme } from './darkTheme';

const ThemeContext = createContext<Theme>(darkTheme);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  // Future: accept a theme prop or derive from system preference
  return <ThemeContext.Provider value={darkTheme}>{children}</ThemeContext.Provider>;
}

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
```

[ASSUMED: This is a standard React context pattern — no specific docs needed]

### Pattern 8: Design Tokens → darkTheme.ts Translation

The executor MUST read `design/high_performance_dark_mode/DESIGN.md` before writing `darkTheme.ts`. Key mappings from DESIGN.md (already verified by reading the file):

| DESIGN.md Token | Semantic Name | Value |
|-----------------|---------------|-------|
| `background` | `colors.background` | `#1e0f11` |
| `on-background` | `colors.textPrimary` | `#f8dcdd` |
| `on-surface-variant` | `colors.textSecondary` | `#e2bec0` |
| `surface-container` | `colors.surface` | `#2b1b1d` |
| `surface-container-high` | `colors.surfaceContainer` | `#362627` |
| `primary` (Electric Red) | `colors.primary` | `#ffb2b8` |
| `primary-container` | `colors.primaryAction` | `#ff506f` |
| `tertiary` (Nitro Blue) | `colors.accent` | `#58d6f1` |
| `outline` | `colors.outline` | `#a9898b` |
| `error` | `colors.error` | `#ffb4ab` |

**Typography:** All use `SpaceGrotesk_*` variants. Map fontSize from px to number (drop "px"). Map lineHeight from ratio (e.g., 1.6 → fontSize * 1.6). Map letterSpacing from em (e.g., -0.02em → fontSize * -0.02).

**Spacing:** DESIGN.md specifies `unit: 4px`, `gutter: 24px`, `margin: 32px`. Map to numbers (drop "px").

**Rounding:** `sm: 0.125rem → 2`, `DEFAULT: 0.25rem → 4`, `md: 0.375rem → 6`, `lg: 0.5rem → 8`, `xl: 0.75rem → 12`, `full: 9999`.

Note: DESIGN.md has some inconsistencies between the YAML frontmatter colors and the prose section. The **YAML frontmatter values are authoritative** — they are the machine-readable token definitions.

### Pattern 9: React Navigation — Bottom Tabs + Native Stack per Tab

```tsx
// frontend/src/navigation/RootNavigator.tsx
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
    <HomeStack.Navigator>
      <HomeStack.Screen name="Home" component={HomeScreen} />
    </HomeStack.Navigator>
  );
}
// (repeat for Create, Profile)

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator>
        <Tab.Screen name="HomeTab" component={HomeStackNavigator} options={{ title: 'Home' }} />
        <Tab.Screen name="CreateTab" component={CreateStackNavigator} options={{ title: 'Create' }} />
        <Tab.Screen name="ProfileTab" component={ProfileStackNavigator} options={{ title: 'Profile' }} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}
```

**Note on React Navigation 8:** npm shows React Navigation is in v8 alpha. The stable release consumed by `npx expo install` is v7. Do not install v8 alpha packages. [VERIFIED: npm registry]

### Pattern 10: Axios Base Client (Phase 1 Stub — Auth Wired in Phase 2)

```typescript
// frontend/src/api/client.ts
import axios from 'axios';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:8000';

export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  timeout: 15000,
  headers: { 'Content-Type': 'application/json' },
});

// Auth interceptor — placeholder for Phase 2 token injection
apiClient.interceptors.request.use(
  (config) => config,  // Phase 2 will inject: Authorization: Bearer <token>
  (error) => Promise.reject(error)
);
```

### Pattern 11: Cloudinary Signed Upload Signature Endpoint (Stub)

Phase 1 registers the endpoint and returns a 501 so it's contractually defined:

```python
# backend/app/upload/routes.py
import time
import cloudinary
from fastapi import APIRouter, HTTPException

router = APIRouter()

@router.post("/signature")
async def get_upload_signature():
    """Generate a signed upload signature for direct Cloudinary upload.
    Phase 1: stub — returns 501 until Cloudinary credentials are configured.
    Phase 3: implement fully.
    """
    raise HTTPException(status_code=501, detail="Not yet implemented")
```

Full implementation (for Phase 3 reference):
```python
# Phase 3 implementation pattern:
timestamp = int(time.time())
params_to_sign = {
    "timestamp": timestamp,
    "folder": f"revvbase/listings",
    "upload_preset": "revvbase_signed",
}
signature = cloudinary.utils.api_sign_request(params_to_sign, settings.cloudinary_api_secret)
return {
    "signature": signature,
    "timestamp": timestamp,
    "api_key": settings.cloudinary_api_key,
    "cloud_name": settings.cloudinary_cloud_name,
}
```

[CITED: https://cloudinary.com/documentation/authentication_signatures]

### Pattern 12: Mock OTP Flow

```python
# backend/app/auth/routes.py
import os
from fastapi import APIRouter
from app.config import get_settings

router = APIRouter()

@router.post("/send-otp")
async def send_otp(phone: str):
    settings = get_settings()
    if settings.mock_otp:
        # Mock mode: log but don't call MSG91
        return {"message": "OTP sent (mock)", "phone": phone}
    # Real: call MSG91 (Phase 2)
    ...

@router.post("/verify-otp")
async def verify_otp(phone: str, otp: str):
    settings = get_settings()
    if settings.mock_otp:
        if otp == "123456":
            # Return a placeholder JWT (Phase 2 will make this real)
            return {"access_token": "mock_token", "token_type": "bearer"}
        raise HTTPException(status_code=400, detail="Invalid OTP")
    # Real: verify with MSG91 (Phase 2)
    ...
```

### Pattern 13: Environment Variables

**Backend — `.env.example`:**
```
DATABASE_URL=postgresql://user:pass@host:5432/dbname
SECRET_KEY=changeme
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
MOCK_OTP=true
```

**Frontend — `.env.example`:**
```
EXPO_PUBLIC_API_URL=http://localhost:8000
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=
```

**Why `EXPO_PUBLIC_` prefix:** Expo CLI inlines env vars prefixed `EXPO_PUBLIC_` at build time. Variables without this prefix are NOT accessible in RN code. `react-native-dotenv` is deprecated. [CITED: https://docs.expo.dev/guides/environment-variables/]

**Critical:** `CLOUDINARY_API_SECRET` must NEVER be prefixed `EXPO_PUBLIC_` — it must only exist on the backend.

### Anti-Patterns to Avoid

- **Domain folders with shared models across domains:** User model lives in `auth/models.py`. Listings reference it via FK UUID only — never import across domains in Phase 1.
- **Running `CREATE EXTENSION postgis` on standard Railway Postgres:** Will fail with "permission denied — must be superuser". Use the PostGIS template from Railway's marketplace.
- **Hardcoding PORT in uvicorn start command:** Railway injects `$PORT` dynamically. Always `--port $PORT`.
- **Using `npm install` instead of `npx expo install` for Expo SDK packages:** Breaks version pinning; native module incompatibilities follow.
- **Storing full Cloudinary URLs in `listing_photos`:** Schema decision locks you in. Store `cloudinary_public_id` only (D-09).
- **AsyncStorage for JWT:** Use `expo-secure-store`. Set up the import in Phase 1 even if tokens aren't stored yet.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Environment config | Custom env parser | `pydantic-settings BaseSettings` | Type validation, Railway env var injection, lru_cache |
| DB migrations | Manual SQL scripts | `Alembic` | Version control, repeatable, Railway preDeployCommand |
| PostGIS column type | Raw SQL string column | `geoalchemy2.Geography` | Type safety, Alembic autogenerate support |
| JWT encode/decode | Custom HMAC | `PyJWT 2.x` | Tested, handles expiry, algorithm negotiation |
| Rate limiting | Custom middleware | `slowapi` | FastAPI-native decorator syntax, Redis-backed optional |
| Font loading | Manual Asset.loadAsync | `@expo-google-fonts/space-grotesk + useFonts` | Handles async loading, error states, splash coordination |
| Splash hold | setTimeout/delay | `expo-splash-screen` | Coordinated with native splash, proper hide timing |
| Theme state | Prop drilling | `React.createContext + useTheme()` | Single source of truth, swappable without touching components |
| HTTP client | Raw `fetch` | `axios` | Interceptors for auth token injection (Phase 2), consistent error handling |

---

## Common Pitfalls

### Pitfall 1: Railway Default Postgres Doesn't Have PostGIS

**What goes wrong:** Developer provisions the standard Railway PostgreSQL service, runs migration 001 which calls `CREATE EXTENSION postgis`, gets "ERROR: permission denied to create extension 'postgis' — must be superuser".

**Why it happens:** Railway provisions a DB user with `CREATEDB` but not `SUPERUSER`. PostGIS extension installation requires superuser. The Railway-managed superuser account is not exposed.

**How to avoid:** Deploy using Railway's **PostGIS template** (available at `railway.com/deploy/postgis`), not the standard PostgreSQL template. The PostGIS template pre-installs the extension as superuser during provisioning. The `CREATE EXTENSION IF NOT EXISTS postgis` in migration 001 then runs without error (it's a no-op when already installed).

**Warning signs:** `CREATE EXTENSION postgis` error in Railway deploy logs. `\dx` in Railway psql shows no `postgis` entry.

[VERIFIED: railway.com search + Railway help station documentation]

### Pitfall 2: GeoAlchemy2 Causes Alembic Autogenerate to Touch PostGIS System Tables

**What goes wrong:** `alembic revision --autogenerate` generates a migration that tries to create/drop `spatial_ref_sys`, `geometry_columns`, `geography_columns` — these are PostGIS-managed system tables. Running this migration fails or corrupts PostGIS state.

**How to avoid:** Register `geoalchemy2.alembic_helpers.include_object` and `render_item` in `alembic/env.py`. These helpers tell Alembic to skip PostGIS-managed tables and render `Geography` columns correctly.

[CITED: https://geoalchemy-2.readthedocs.io/en/0.14.3/alembic_helpers.html]

### Pitfall 3: `$PORT` vs Hardcoded 8000 in uvicorn

**What goes wrong:** `startCommand = "uvicorn app.main:app --host 0.0.0.0 --port 8000"`. Railway assigns a random port. Service starts, binds to 8000, Railway proxy can't reach it, health check fails forever, deploy stuck.

**How to avoid:** Always use `--port $PORT`. Railway exposes the assigned port via the `PORT` environment variable.

### Pitfall 4: SQLModel + GeoAlchemy2 Field Declaration

**What goes wrong:** `location: Optional[Geography] = Field(default=None)` — SQLModel doesn't know how to handle `Geography` as a Python type hint. Migration autogenerates wrong column type or fails to serialize.

**How to avoid:** Use `sa_column=Column(Geography(...), nullable=True)` as shown in Pattern 4. The `sa_column` bypass lets the SQLAlchemy-native `Geography` type pass through correctly.

### Pitfall 5: Expo SDK Version Mismatch via `npm install`

**What goes wrong:** Developer uses `npm install expo-secure-store` instead of `npx expo install expo-secure-store`. Gets a version incompatible with Expo SDK 55. Native module initialization fails on device with cryptic error.

**How to avoid:** For any `expo-*` package, always use `npx expo install`. For non-Expo packages (`axios`, `react-hook-form`, `zod`), `npm install` is fine.

### Pitfall 6: EXPO_PUBLIC_ Prefix Omitted for API URL

**What goes wrong:** `.env` has `API_URL=http://...`. Code reads `process.env.API_URL`. Expo CLI does NOT inline this. At runtime, `API_URL` is `undefined`. Axios base URL becomes `"undefinedundefined/api/v1"`. Every API call fails with an opaque network error.

**How to avoid:** All env vars accessed in React Native code MUST be prefixed `EXPO_PUBLIC_`. Backend-only secrets (like `CLOUDINARY_API_SECRET`) have no prefix and live only in the backend `.env`.

### Pitfall 7: zustand 5.x vs 4.x API Difference

**What goes wrong:** STACK.md documents zustand 4.x. npm registry shows zustand is at 5.0.12. While basic `create()` usage is the same, middleware composition syntax changed slightly in v5. Using v4 patterns verbatim may produce TypeScript type errors.

**How to avoid:** Use the zustand v5 `create` import from `zustand` (not `zustand/vanilla`). For the auth store in Phase 1, the pattern is identical between v4 and v5.

```typescript
// Works in zustand 5.x:
import { create } from 'zustand';

interface AuthState {
  token: string | null;
  setToken: (token: string | null) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  setToken: (token) => set({ token }),
}));
```

[VERIFIED: npm registry — zustand 5.0.12]

---

## Code Examples

### Complete vehicle_makes Seed Data (migration 001)

```python
# Inside upgrade() of migration 001, after creating vehicle_makes table:
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
```

[ASSUMED: Brand/model selection based on market knowledge — verify completeness with user if needed]

### Health Check That Also Verifies DB Connection

```python
# backend/app/main.py
from sqlalchemy import text
from app.database import engine

@app.get("/api/v1/health")
async def health():
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return {"status": "ok", "db": "connected"}
    except Exception as e:
        return {"status": "degraded", "db": str(e)}, 503
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `python-jose` for JWT | `PyJWT 2.x` | 2022-2023 | `python-jose` has known CVEs; CLAUDE.md forbids it |
| `react-native-dotenv` | `EXPO_PUBLIC_` prefix native support | Expo SDK 49+ | `react-native-dotenv` is deprecated; incompatible with Expo Router |
| FlatList for feeds | `@shopify/flash-list` | 2022 | FlashList is now the standard for image-heavy lists |
| Expo SDK 52 (STACK.md reference) | Expo SDK 55 (latest stable) | Nov 2025 | SDK 55 is current; SDK 52 patterns still apply |
| SQLModel 0.0.21 (STACK.md reference) | SQLModel 0.0.38 | 2025 | Same API; 0.0.38 has better SQLAlchemy 2.x compat |
| zustand 4.x | zustand 5.x | 2024 | Basic API identical; middleware types differ |
| zod 3.x | zod 4.x | 2025 | Core API identical for field types used here |
| React Navigation 6.x | React Navigation 7.x (stable) | Nov 2024 | v7 has static API; v8 alpha exists but not stable |

**Note:** React Navigation 8 is in alpha as of early 2026. Use stable 7.x. [VERIFIED: npm registry + reactnavigation.org blog]

---

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | `upload/` can be a separate folder at app level rather than a domain folder | Architecture Patterns → Project Structure | Minor: executor creates `app/upload/` instead; no functional impact |
| A2 | vehicle_makes seed list is complete and representative | Code Examples → Seed Data | Low: missing brands can be added via a new migration |
| A3 | Railway PostGIS template (not standard PG template) is available for free/hobby plan | Pitfalls → Pitfall 1 | High: if PostGIS template requires paid plan, migration approach changes entirely |
| A4 | Zustand 5.x basic `create()` API is backward-compatible with v4 patterns for simple stores | Standard Stack → zustand | Low: TypeScript type errors if wrong; trivial to fix |
| A5 | ThemeContext pattern (createContext + provider) works identically in Expo New Architecture | Code Examples → ThemeContext | Low: React context is not architecture-dependent |

---

## Open Questions

1. **Railway PostGIS template plan requirement**
   - What we know: Railway's standard Postgres doesn't include PostGIS; a PostGIS template exists
   - What's unclear: Whether the PostGIS template is available on the Hobby plan or requires Pro
   - Recommendation: Verify at `railway.com/deploy/postgis` before provisioning. If Hobby plan doesn't support it, the alternative is: provision standard Postgres + run `ALTER ROLE <user> SUPERUSER` from Railway's psql console (some users report this works). Document in plan as a manual verification step.

2. **Auth guard bottom sheet library**
   - What we know: D-05 requires a bottom sheet modal for the auth guard
   - What's unclear: Which bottom sheet library to use (no library was specified in CONTEXT.md)
   - Recommendation: Use `@gorhom/bottom-sheet` (the de facto standard for React Native bottom sheets, New Architecture compatible). This is Phase 1's only unspecified library dependency. Plan should include installing `@gorhom/bottom-sheet` + `react-native-gesture-handler` + `react-native-reanimated`.

3. **monorepo — single Railway service vs. separate Railway service for frontend**
   - What we know: There is no frontend server; Expo apps are native bundles, not web servers. Railway only needs to host the FastAPI backend.
   - What's unclear: The Railway project structure (one project → one service for FastAPI + one DB service)
   - Recommendation: Single Railway project. Two services: (1) FastAPI web service (root: /backend), (2) PostgreSQL (PostGIS template). No separate "frontend" Railway service.

---

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|------------|-----------|---------|----------|
| Node.js | Frontend scaffold | ✓ | (npm works → Node available) | — |
| npm | Frontend scaffold | ✓ | confirmed by package lookups | — |
| Python / pip | Backend setup | ✓ | pip index commands work | — |
| PostgreSQL client tools | Local DB dev | [ASSUMED] | — | Use Railway psql via CLI |
| Railway CLI | Deploy + log access | [ASSUMED] | — | Railway dashboard (web) |
| Cloudinary account | Upload signature | Requires setup | — | Mock in Phase 1; real in Phase 3 |
| MSG91 account | OTP send | Not needed for Phase 1 | — | MOCK_OTP=true covers all of Phase 1 |
| Android device/emulator | Mobile testing | [ASSUMED] | — | Expo Go on physical device |

---

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework (Backend) | pytest + httpx (pytest-asyncio 1.3.0) |
| Framework (Frontend) | Jest (configured by Expo) + @testing-library/react-native |
| Backend config | `pyproject.toml` [tool.pytest.ini_options] |
| Backend quick run | `pytest tests/ -x -q` |
| Backend full suite | `pytest tests/ -v` |
| Frontend quick run | `npm test -- --watchAll=false` |

### Phase 1 Requirements → Test Map

Phase 1 is an infrastructure phase with no user-facing requirements. Tests validate scaffold correctness:

| Behavior | Test Type | Automated Command | File |
|----------|-----------|-------------------|------|
| Health endpoint returns 200 | smoke | `pytest tests/test_health.py -x` | Wave 0 gap |
| DB connection via health endpoint | smoke | included above | Wave 0 gap |
| Settings load from env vars | unit | `pytest tests/test_config.py -x` | Wave 0 gap |
| Mock OTP send returns 200 | smoke | `pytest tests/test_auth.py::test_mock_otp_send -x` | Wave 0 gap |
| Mock OTP verify accepts 123456 | smoke | `pytest tests/test_auth.py::test_mock_otp_verify -x` | Wave 0 gap |
| Alembic migration 001 applies cleanly | integration | `alembic upgrade head && alembic check` | n/a — run in preDeployCommand |
| PostGIS extension installed | integration | `pytest tests/test_db.py::test_postgis_enabled -x` | Wave 0 gap |
| vehicle_makes table seeded | integration | `pytest tests/test_db.py::test_seed_data -x` | Wave 0 gap |

### Sampling Rate

- **Per task commit:** `pytest tests/test_health.py tests/test_config.py -x -q` (< 5 seconds)
- **Per wave merge:** `pytest tests/ -v`
- **Phase gate:** Full suite green before `/gsd-verify-work`

### Wave 0 Gaps (backend tests to create)

- [ ] `backend/tests/__init__.py`
- [ ] `backend/tests/conftest.py` — shared `TestClient`, DB session override
- [ ] `backend/tests/test_health.py` — health endpoint smoke test
- [ ] `backend/tests/test_config.py` — settings load unit test
- [ ] `backend/tests/test_auth.py` — mock OTP flow tests
- [ ] `backend/tests/test_db.py` — PostGIS + seed data integration tests

Framework install: `uv add --dev pytest pytest-asyncio httpx` (or pip equivalent)

---

## Security Domain

Security enforcement is enabled (`security_enforcement: true` in config.json). ASVS Level 1.

### Applicable ASVS Categories

| ASVS Category | Applies to Phase 1 | Standard Control |
|---------------|-------------------|-----------------|
| V2 Authentication | Partial — mock OTP stub only | PyJWT HS256; full implementation Phase 2 |
| V3 Session Management | No — no sessions in Phase 1 | Deferred to Phase 2 |
| V4 Access Control | No — no protected routes yet | Deferred to Phase 2 |
| V5 Input Validation | Yes — env var validation, OTP phone format | pydantic-settings; phone regex validation in mock OTP |
| V6 Cryptography | No — no crypto operations in Phase 1 scope | PyJWT prepared but not exercised |

### Phase 1 Threat Surface (Minimal)

| Pattern | STRIDE | Mitigation in Phase 1 |
|---------|--------|-----------------------|
| Cloudinary API secret in git | Information Disclosure | `.env` gitignored; `.env.example` has no real values; secret lives on backend only |
| OTP endpoint without rate limiting | Denial of Service | `slowapi` installed; rate limiting middleware stubbed even for mock OTP (prevents habit of shipping without it) |
| Mock OTP code in production | Elevation of Privilege | `MOCK_OTP` is an env var; default `true` locally, MUST be `false` on Railway before Phase 2 launch |
| CORS wildcard in development | Information Disclosure | Acceptable for MVP development; tighten before public launch (document as known debt) |

---

## Sources

### Primary (HIGH confidence)
- npm registry (`npm view <pkg> version`) — all frontend package versions verified
- pypi registry (`pip index versions <pkg>`) — all backend package versions verified
- [Expo Fonts docs](https://docs.expo.dev/develop/user-interface/fonts/) — useFonts + SplashScreen pattern
- [FastAPI Settings docs](https://fastapi.tiangolo.com/advanced/settings/) — pydantic-settings BaseSettings pattern
- [FastAPI Bigger Applications docs](https://fastapi.tiangolo.com/tutorial/bigger-applications/) — APIRouter pattern
- [Railway Config as Code docs](https://docs.railway.com/reference/config-as-code) — railway.toml schema
- [Cloudinary Auth Signatures docs](https://cloudinary.com/documentation/authentication_signatures) — Python signature generation
- [GeoAlchemy2 Alembic helpers docs](https://geoalchemy-2.readthedocs.io/en/0.14.3/alembic_helpers.html) — env.py configuration
- [Expo Environment Variables docs](https://docs.expo.dev/guides/environment-variables/) — EXPO_PUBLIC_ pattern

### Secondary (MEDIUM confidence)
- [Railway PostgreSQL docs](https://docs.railway.com/databases/postgresql) — PostGIS template requirement
- [Railway Help Station — PostGIS](https://station.railway.com/questions/installing-postgis-extension-with-post-0643a575) — superuser permission issue confirmed

### Tertiary (LOW confidence)
- STACK.md (prior research, 2026-05-03) — architectural patterns, not verified versions
- ARCHITECTURE.md (prior research, 2026-05-03) — domain structure reference

---

## Metadata

**Confidence breakdown:**
- Standard Stack versions: HIGH — verified via npm/pypi registry in this session
- FastAPI patterns: HIGH — cited from official FastAPI docs
- Railway deployment: HIGH — cited from official Railway docs; PostGIS constraint verified via Railway help station
- GeoAlchemy2 + Alembic: HIGH — cited from official GeoAlchemy2 docs
- Expo font/splash pattern: HIGH — cited from official Expo docs
- Theme token mapping: MEDIUM — DESIGN.md values read directly but mapping to TypeScript numbers requires executor judgment
- vehicle_makes seed data: MEDIUM — reasonable market coverage; user should confirm completeness

**Research date:** 2026-05-04
**Valid until:** 2026-06-04 (30 days — stable ecosystem)
