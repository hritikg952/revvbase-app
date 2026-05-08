# Phase 1: Foundation — Validation Plan

**Phase:** 01-foundation
**Nyquist validation:** enabled (per `.planning/config.json`)
**Generated:** 2026-05-08

---

## Purpose

This file specifies the automated and manual test coverage requirements for Phase 1. The executor must satisfy these checks before closing the phase. The verifier reads this file during goal-backward analysis.

---

## Coverage Requirements

### Backend (FastAPI / PostgreSQL)

| ID | Requirement | Test Type | Location | Pass Condition |
|----|-------------|-----------|----------|----------------|
| V-BE-01 | `GET /api/v1/health` returns 200 | Integration | `backend/tests/test_health.py` | `response.status_code == 200` |
| V-BE-02 | Alembic migration 001 applies cleanly | Integration | `backend/tests/test_migrations.py` | `alembic upgrade head` exits 0; all 4 tables exist |
| V-BE-03 | `users`, `listings`, `listing_photos`, `vehicle_makes` tables exist after migration | Integration | `backend/tests/test_migrations.py` | `SELECT 1 FROM <table>` succeeds for each |
| V-BE-04 | PostGIS extension enabled — `geometry_columns` view exists | Integration | `backend/tests/test_migrations.py` | `SELECT * FROM geometry_columns` returns 200 without error |
| V-BE-05 | `listings.location` column has type `geography(Point,4326)` | Integration | `backend/tests/test_migrations.py` | Schema introspection on `information_schema.columns` |
| V-BE-06 | `listings.attributes` column has type `jsonb` | Integration | `backend/tests/test_migrations.py` | Schema introspection |
| V-BE-07 | `POST /api/v1/upload/signature` returns a Cloudinary signature payload | Integration | `backend/tests/test_upload.py` | `response.status_code == 200`; payload contains `signature`, `timestamp`, `api_key`; does NOT contain `api_secret` |
| V-BE-08 | `POST /api/v1/auth/send-otp` with `MOCK_OTP=true` returns `{mock: true}` | Integration | `backend/tests/test_auth.py` | Response body has `"mock": true` field |
| V-BE-09 | `POST /api/v1/auth/verify-otp` with code `123456` and `MOCK_OTP=true` returns 200 | Integration | `backend/tests/test_auth.py` | `response.status_code == 200` |
| V-BE-10 | `POST /api/v1/auth/verify-otp` with wrong code and `MOCK_OTP=true` returns 400 | Integration | `backend/tests/test_auth.py` | `response.status_code == 400` |
| V-BE-11 | `vehicle_makes` table is seeded with at least 10 Indian brands + "Other" | Integration | `backend/tests/test_migrations.py` | `SELECT COUNT(*) FROM vehicle_makes` >= 11; "Other" row exists |
| V-BE-12 | All PKs are UUID type | Integration | `backend/tests/test_migrations.py` | Schema introspection on `id` columns of all 4 tables |

### Frontend (React Native / Expo)

| ID | Requirement | Test Type | Location | Pass Condition |
|----|-------------|-----------|----------|----------------|
| V-FE-01 | TypeScript compiles cleanly | Static | CI / manual | `npx tsc --noEmit` exits 0 |
| V-FE-02 | All Expo SDK package versions are consistent | Static | CI / manual | `npx expo install --check` exits 0 |
| V-FE-03 | No raw hex literals in screen or navigation files | Static | `backend/tests/` or grep | `grep -rE '#[0-9a-fA-F]{3,6}' frontend/src/screens/ frontend/src/navigation/ frontend/src/components/` returns no matches |
| V-FE-04 | `darkTheme.ts` contains all 8 DESIGN.md hex tokens | Static | manual | All 8 values present: `#1e0f11`, `#f8dcdd`, `#ff506f`, `#58d6f1`, `#ffb2b8`, `#e2bec0`, `#a9898b`, `#ffb4ab` |
| V-FE-05 | `authStore.ts` never imports or references `AsyncStorage` | Static | grep | `grep -r AsyncStorage frontend/src/store/` returns no matches |
| V-FE-06 | `client.ts` reads `EXPO_PUBLIC_API_URL` (not bare `API_URL`) | Static | grep | `grep EXPO_PUBLIC_API_URL frontend/src/api/client.ts` matches |
| V-FE-07 | `App.tsx` first import is `react-native-gesture-handler` | Static | manual | First non-blank line is `import 'react-native-gesture-handler'` |
| V-FE-08 | `SplashScreen.preventAutoHideAsync()` called at module scope | Static | manual | Call exists outside any React component or hook |
| V-FE-09 | `AuthGateSheet.tsx` exists and uses `@gorhom/bottom-sheet` | Static | grep | File exists; contains `@gorhom/bottom-sheet` import |
| V-FE-10 | `RootNavigator.tsx` wires `tabPress` listener with `e.preventDefault()` for Create and Profile | Static | grep | `grep -c 'e.preventDefault' frontend/src/navigation/RootNavigator.tsx` returns `2` |
| V-FE-11 | App boots without JS error on device/emulator (visual) | Manual / smoke | — | `npx expo start` launches; no red error overlay; 3 tabs visible; dark background renders |
| V-FE-12 | Tapping Create or Profile while unauthenticated opens bottom sheet (visual) | Manual / smoke | — | Bottom sheet slides up; "Sign in to continue" text visible; user stays on current tab |

---

## Test Tooling

| Tool | Purpose | Command |
|------|---------|---------|
| `pytest` | Backend integration tests | `cd backend && pytest -v` |
| `httpx.AsyncClient` | FastAPI test client (async) | Used in `conftest.py` |
| `npx tsc --noEmit` | Frontend static type check | `cd frontend && npx tsc --noEmit` |
| `npx expo install --check` | Expo version consistency | `cd frontend && npx expo install --check` |
| Expo Go / Android emulator | Visual smoke test | `cd frontend && npx expo start` |

---

## Minimum Pass Threshold

**Backend:** V-BE-01 through V-BE-12 all pass (100% required — these are infrastructure invariants).

**Frontend Static:** V-FE-01 through V-FE-10 all pass (100% required).

**Frontend Visual:** V-FE-11 and V-FE-12 must be manually confirmed before the phase is marked complete. An automated screenshot test is out of scope for Phase 1.

---

## Phase 2 Handoff Gates

Phase 2 (Authentication) cannot start until all of the following are true:

1. `GET /api/v1/health` returns 200 from the Railway-deployed instance.
2. `POST /api/v1/auth/send-otp` + `verify-otp` endpoints work with `MOCK_OTP=true`.
3. `frontend/src/store/authStore.ts` `setToken` / `loadToken` / `clearToken` round-trip works.
4. `AuthGateSheet` appears when an unauthenticated user taps Create or Profile.
5. `frontend/src/api/client.ts` attaches `Authorization: Bearer <token>` when the store has a token.
