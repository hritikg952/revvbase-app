# Project State

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

**Core value:** A visitor can discover two-wheelers, and an authenticated user can publish a listing with the key details needed to start a sale.
**Current focus:** Milestone completion audit.

## Current Position

Phase: 5 of 5 (MVP validation)
Status: Complete and verified
Last activity: 2026-08-01 — Full local-browser and hosted-Supabase MVP acceptance passed; synthetic UAT data removed.

Progress: [██████████] 100%

## Existing implementation context

- The repository contains a working Next.js frontend under `src/`.
- The partial FastAPI foundation under `backend/` is historical scaffolding and is not the active MVP architecture.
- Supabase schema, RLS policies, and reference seed data are deployed and advisor-clean.
- SEC-01 through SEC-03 are validated against the hosted database.
- Hosted Supabase project `revvbase` exists in `ap-south-1` with project ref `qokumaemcqwkqhrxyolc`.
- Phases 1–5 are complete and verified within the explicitly non-hosted MVP scope.

## Decisions

- Public browsing does not require authentication.
- Email/password is the first authentication method.
- One account can both browse and list; there are no buyer/seller roles.
- Listing CRUD is required; minimal management controls are allowed, but a polished seller dashboard is deferred.
- Images are optional and use a stock placeholder initially.
- Location is stored now; sophisticated location search is deferred.
- No admin/moderation workflow in MVP.
- Supabase is the planned backend; Railway is not required unless a later requirement demands a custom service.
- Phase 1 uses hosted-project validation; Docker Desktop and the local Supabase stack are not MVP prerequisites.

## Risks and open decisions

- Production Auth redirect URLs cannot be finalized until hosting resumes and a production origin exists.
- Transactional email customization remains a post-MVP concern; development email/password Auth is working.
- Supabase security advisors currently recommend leaked-password protection (available on paid plans) and additional MFA options; neither is an MVP requirement, and RLS/Auth acceptance passes.

## Deferred items

| Item | Reason |
|---|---|
| Phone OTP / MSG91 | Not needed for MVP |
| Railway/FastAPI deployment | Supabase covers MVP backend needs |
| Image upload pipeline | Stock placeholder is sufficient initially |
| Seller dashboard | CRUD matters; dedicated management UI can follow |
| Search, filters, radius queries | Discovery sophistication after core loop validation |
| Moderation and trust features | Need marketplace usage signal first |
| Production hosting and smoke test | Explicitly deferred by the user on 2026-07-30 |

## Session continuity

Next action: run the GSD milestone audit. When the user later re-enables hosting, create a new deployment phase, add its origin to Supabase Auth configuration, and run a production smoke test.

---
*Updated 2026-08-01 after complete non-hosted MVP validation and cleanup.*
