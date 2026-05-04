# Phase 1: Foundation - Context

**Gathered:** 2026-05-04
**Status:** Ready for planning

<domain>
## Phase Boundary

Phase 1 delivers the project infrastructure: monorepo scaffolded, PostGIS-ready PostgreSQL schema deployed via Alembic, FastAPI skeleton running on Railway, Cloudinary and MSG91 (mock) wired up, and Expo app booting on a physical Android device with a working navigation shell and design system loaded. No user-facing features — pure plumbing that all subsequent phases build on.

</domain>

<decisions>
## Implementation Decisions

### Repository Structure
- **D-01:** Top-level split: `/frontend` (Expo app) and `/backend` (FastAPI). Simple, unambiguous.
- **D-02:** Backend is domain-driven: `/backend/app/auth/`, `/backend/app/listings/`, `/backend/app/users/` — each domain folder contains `routes.py`, `models.py`, `schemas.py`. Clean boundaries for a marketplace from day 1.

### Navigation Shell
- **D-03:** Bottom tab navigator with 3 tabs: **Home**, **Create**, **Profile**. React Navigation native-stack inside each tab.
- **D-04:** Each tab renders a real placeholder screen (tab name visible, otherwise empty). Navigation is fully wired end-to-end in Phase 1.
- **D-05:** Auth guard: when a non-logged-in user taps Create or Profile, a **bottom sheet modal** appears ("Sign in to continue") — user does NOT leave the current screen. Login flow launches from the modal.

### Database Schema (Migration 001)
- **D-06:** Migration 001 creates all four tables: `users`, `listings`, `listing_photos`, `vehicle_makes`.
- **D-07:** `users` table: `id` (UUID PK), `phone` (unique), `display_name` (nullable), `phone_verified` (bool), `created_at`.
- **D-08:** `listings` table: `id` (UUID PK), `seller_id` (FK → users), `vehicle_type`, `make`, `model`, `year`, `odometer`, `price` (INTEGER in rupees), `city`, `fuel_type`, `owners`, `insurance_date`, `description` (nullable), `status` (enum: active/sold/deleted), `attributes` (JSONB for EV fields), `location` (GEOGRAPHY(POINT, 4326) nullable — PostGIS), `created_at`, `updated_at`.
- **D-09:** `listing_photos` table: `id` (UUID PK), `listing_id` (FK → listings), `cloudinary_public_id` (store public_id only — NOT full URLs), `sort_order` (INTEGER, first = cover photo), `created_at`.
- **D-10:** `vehicle_makes` table: `id` (UUID PK), `make` (e.g. "Honda"), `model` (e.g. "Activa 6G"), `vehicle_type` (enum). Seeded with top Indian brands (Honda, Yamaha, Royal Enfield, Bajaj, TVS, Hero, Suzuki, KTM, Ola, Ather, TVS iQube, etc.) + supports "Other" fallback to free-text in the app.
- **D-11:** Price stored as INTEGER in rupees (no paise).
- **D-12:** All primary keys are UUIDs (avoids enumerable IDs on public API).
- **D-13:** Soft-delete via `status` field on listings — never hard-delete.
- **D-14:** PostGIS extension enabled from day 1 (`CREATE EXTENSION IF NOT EXISTS postgis`). Spatial index on `location` column. Column is nullable until radius search is built.
- **D-15:** `seller_active_listings_count` enforced at application layer (not DB constraint) — API returns 403 when seller already has 5 active listings.

### Design System / Theming
- **D-16:** Theme system is **context-driven and swappable**: typed `Theme` interface with `colors`, `typography`, `spacing` keys. `darkTheme` (current design) and stub `lightTheme` both implement the interface.
- **D-17:** Components call `useTheme()` hook — never import raw hex values or hardcoded colors directly. This makes light/dark toggle and full theme swaps a single-line change in the provider.
- **D-18:** Semantic color naming throughout: `colors.background`, `colors.primary`, `colors.textPrimary`, `colors.surface`, `colors.accent` — not hex strings in component files.
- **D-19:** Space Grotesk loaded via `expo-font` + `useFonts` hook using `@expo-google-fonts/space-grotesk`. Splash screen held until fonts load.
- **D-20:** Design tokens sourced from `design/high_performance_dark_mode/DESIGN.md` — executor MUST read this file and translate the color palette, typography scale, and spacing values into `frontend/src/theme/darkTheme.ts`.

### Integrations (Phase 1 Wiring)
- **D-21:** OTP is mocked for MVP: `/auth/send-otp` returns success without calling MSG91 when `MOCK_OTP=true` env var is set. Any phone number accepts code `123456`. Swap to real MSG91 by setting `MOCK_OTP=false` before production.
- **D-22:** Cloudinary: account configured, signed-upload endpoint stubbed at `/api/v1/upload/signature`. Real uploads tested manually in Phase 3.
- **D-23:** All secrets (Railway DB URL, Cloudinary API key/secret, MSG91 key) via environment variables. `.env.example` committed; `.env` gitignored.

### Claude's Discretion
- Specific Railway service configuration (single service vs. separate web + worker — single service is fine for MVP).
- Alembic migration naming convention.
- Python dependency management tool (`uv` preferred over `pip` for speed, but either is fine).
- Expo app name and bundle identifier (`com.revvbase.app`).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Design System
- `design/high_performance_dark_mode/DESIGN.md` — Full color palette, typography scale, spacing values, component patterns. MUST read before creating theme.ts.
- `design/home_bike_listings_dark/code.html` — Reference implementation of the listings feed card design.
- `design/bike_details_dark/code.html` — Reference implementation of the vehicle detail page design.
- `design/sell_your_bike_dark/code.html` — Reference implementation of the listing creation form design.

### Project Planning
- `.planning/PROJECT.md` — Core value, constraints, key decisions, stack rationale.
- `.planning/REQUIREMENTS.md` — All 20 v1 requirements with REQ-IDs and traceability to phases.
- `.planning/ROADMAP.md` — Phase goals, success criteria, and plan breakdown for all 5 phases.
- `.planning/research/STACK.md` — Specific library versions and integration patterns for the full stack.
- `.planning/research/ARCHITECTURE.md` — Component boundaries, data flow, build order, schema patterns.
- `.planning/research/PITFALLS.md` — Common mistakes for this domain; mandatory reading before planning.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `design/` HTML mockups — Visual reference for all 4 core screens. Not code to reuse, but ground truth for how screens should look. Executor should inspect these before building any UI.

### Established Patterns
- Greenfield project — no existing code patterns to carry forward.
- Design system is the only established constraint: dark-first, Space Grotesk, Electric Red (#FF4D6D) CTAs, Nitro Blue (#48CAE4) accents, no drop shadows (tonal elevation only).

### Integration Points
- Phase 1 foundation is the integration point for all subsequent phases — DB schema decisions here are permanent, navigation shell here is the skeleton all screens are added into.

</code_context>

<specifics>
## Specific Ideas

- **Theming philosophy:** User explicitly wants theme switching (dark/light toggle) to be easy in future, and full theme replacement to be a simple swap. This means NO hardcoded colors anywhere — only `useTheme()` hook results used in components. This is a hard constraint, not a preference.
- **DB completeness upfront:** User confirmed all 4 tables should be in migration 001. Schema decisions are permanent — executor should be thorough here.
- **Seed data:** `vehicle_makes` table seeded with real Indian brand/model data. Include Ola and Ather (EV brands) in the seed.
- **Auth guard UX:** Bottom sheet modal (not redirect) when non-auth user taps gated tab. Keeps user on current screen.

</specifics>

<deferred>
## Deferred Ideas

- None — discussion stayed within Phase 1 scope.

</deferred>

---

*Phase: 1-Foundation*
*Context gathered: 2026-05-04*
