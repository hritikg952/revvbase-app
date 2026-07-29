# Project State

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

**Core value:** A visitor can discover two-wheelers, and an authenticated user can publish a listing with the key details needed to start a sale.
**Current focus:** Re-plan around a web MVP using Supabase.

## Current Position

Milestone: 1 of 5 (Supabase foundation)
Status: Ready to plan
Last activity: 2026-07-29 — product scope re-aligned from Expo/FastAPI/Railway to Next.js/React + Supabase.

Progress: [░░░░░░░░░░] 0%

## Existing implementation context

- The repository currently contains a partial FastAPI foundation under `backend/`.
- That backend is historical scaffolding and is not the active target architecture for the revised MVP.
- There is no frontend application yet.
- No revised Supabase schema, RLS policies, or production deployment has been implemented.
- No MVP requirement has been validated.

## Decisions

- Public browsing does not require authentication.
- Email/password is the first authentication method.
- One account can both browse and list; there are no buyer/seller roles.
- Listing CRUD is required; minimal management controls are allowed, but a polished seller dashboard is deferred.
- Images are optional and use a stock placeholder initially.
- Location is stored now; sophisticated location search is deferred.
- No admin/moderation workflow in MVP.
- Supabase is the planned backend; Railway is not required unless a later requirement demands a custom service.

## Risks and open decisions

- Supabase email/password redirect URLs and production email configuration need to be defined during Milestone 2.
- RLS policies are the primary security boundary and must be tested before public deployment.
- Existing backend model fields need a deliberate SQL/Supabase migration rather than a blind copy.
- The exact Next.js setup (App Router, styling, hosting provider) remains provisional.

## Deferred items

| Item | Reason |
|---|---|
| Phone OTP / MSG91 | Not needed for MVP |
| Railway/FastAPI deployment | Supabase covers MVP backend needs |
| Image upload pipeline | Stock placeholder is sufficient initially |
| Seller dashboard | CRUD matters; dedicated management UI can follow |
| Search, filters, radius queries | Discovery sophistication after core loop validation |
| Moderation and trust features | Need marketplace usage signal first |

## Session continuity

Next action: plan Milestone 1 in detail, then implement only after schema, RLS, auth, and frontend choices are agreed.

---
*Updated 2026-07-29 after product re-alignment.*
