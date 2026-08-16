---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
current_phase: 06
current_phase_name: listing-image-management
status: verifying
stopped_at: Completed 06-06-PLAN.md
last_updated: "2026-08-16T08:48:00.000Z"
last_activity: 2026-08-16
last_activity_desc: Completed quick task 260816-jrk: beginner-friendly interactive architecture city explainer
progress:
  total_phases: 7
  completed_phases: 6
  total_plans: 14
  completed_plans: 11
---

# Project State

## Project Reference

See: `.planning/PROJECT.md` and `.planning/ROADMAP.md`.

**Core value:** A visitor can discover two-wheelers, and an authenticated user can publish a listing with the key details needed to start a sale.
**Current focus:** Phase 06 — listing-image-management

## Current Position

Phase: 06 (listing-image-management) — EXECUTING
Plan: 6 of 6
Status: Phase complete — ready for verification
Last activity: 2026-08-16 — Completed quick task 260816-fka: typed local Indian two-wheeler catalog and cascading listing-form selects

Progress: [████████░░] 79%

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
- [Phase ?]: Use configurable 20 MB and 40 megapixel source ceilings, then store only canonical WebP within 2560 px and 1 MB.
- [Phase ?]: Pin human-approved heic-to at 1.5.2 and dynamically load it only for detected HEIC or HEIF bytes.
- [Phase ?]: Validate source signatures and canonical WebP MIME, RIFF signature, and byte size rather than trusting filenames or claimed MIME.
- [Phase ?]: Store provider-opaque image keys and derive stable public URLs only inside the Supabase storage adapter.
- [Phase ?]: Reserve listing status transitions and permanent image deletion for protected server lifecycle authority.
- [Phase ?]: Link the migration-owned image policy singleton to the versioned application settings source.
- [Phase ?]: Authenticate the caller JWT and verify listing ownership before using Edge Function service-role authority.
- [Phase ?]: Preserve the safest truthful listing state and return retryable errors when cross-system cleanup fails.
- [Phase ?]: Accept only closed lifecycle action payloads and authoritative owner/listing/storage-key bindings.
- [Phase ?]: Use public injected workflow seams for draft publication and immediate photo lifecycle effects without testing private React implementation details.
- [Phase ?]: Treat protected lifecycle success and failure statuses as authoritative throughout seller photo management.
- [Phase ?]: Keep the current storage-provider adapter behind a browser infrastructure composition root; manager and domain code consume only neutral ports.
- [Phase ?]: Filter lifecycle state in both Supabase queries and pure consumer projections so public consumers never request draft metadata.
- [Phase ?]: Remove owner cards only after the protected lifecycle returns status=deleted; retain failures with retry guidance.
- [Phase ?]: Remove listings.image_url after hosted inspection found zero non-null values and the user explicitly approved the one-way cutover.
- [Phase ?]: Parse structured Edge Function non-2xx bodies from FunctionsHttpError context before generic SDK fallback.
- [Phase ?]: Project seller image guidance and edit messaging from validated settings and authoritative lifecycle status.
- [Phase ?]: Restore images.required=false locally and hosted after proving both publication modes.

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

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|---|---|---|---|
| 260801-fjg | Create a startup runbook for humans and agents | 2026-08-01 | 00372ec | [260801-fjg-create-a-startup-runbook-for-humans-and-](./quick/260801-fjg-create-a-startup-runbook-for-humans-and-/) |
| 260816-fka | Implement GitHub issue #2: typed local Indian two-wheeler catalog and cascading listing-form selects | 2026-08-16 | e83b74b | [260816-fka-implement-github-issue-2-typed-local-dat](./quick/260816-fka-implement-github-issue-2-typed-local-dat/) |
| 260816-gqv | Implement buyer-seller negotiation chat with offers, booking state, inbox, and RLS | 2026-08-16 | 876c097 | [260816-gqv-implement-buyer-seller-negotiation-chat-](./quick/260816-gqv-implement-buyer-seller-negotiation-chat-/) |
| 260816-iv0 | Make offer decisions reversible and refresh the chat unread badge | 2026-08-16 | 067f8e3 | [260816-iv0-make-offer-decisions-reversible-and-refr](./quick/260816-iv0-make-offer-decisions-reversible-and-refr/) |
| 260816-nfo | Resolve localhost negotiation runtime errors: apply schema migration, guard invalid conversation IDs, and format Supabase errors | 2026-08-16 | 746ee6d | [260816-nfo-resolve-localhost-negotiation-runtime-er](./quick/260816-nfo-resolve-localhost-negotiation-runtime-er/) |
| 260816-jrk | Create beginner-friendly interactive architecture city explainer | 2026-08-16 | 9f8a4f8 | [260816-jrk-create-a-beginner-friendly-interactive-s](./quick/260816-jrk-create-a-beginner-friendly-interactive-s/) |

## Session continuity

**Last session:** 2026-08-05T09:58:19.497Z
**Stopped at:** Completed 06-06-PLAN.md
**Resume file:** None

Next action: use `START-HERE.md` for local startup and maintenance. When the user later re-enables hosting, create a new deployment phase, add its origin to Supabase Auth configuration, and run a production smoke test.

---
*Updated 2026-08-01 after adding the shared startup runbook.*

## Performance Metrics

| Plan | Duration | Tasks | Files |
|------|----------|-------|-------|
| Phase 06 P01 | 24min | 2 tasks | 6 files |
| Phase 06 P02 | 14min | 2 tasks | 8 files |
| Phase 06 P03 | 21min | 3 tasks | 6 files |
| Phase 06 P04 | 15min | 2 tasks | 8 files |
| Phase 06 P05 | 14min | 2 tasks | 10 files |
| Phase 06 P06 | 3d 15h 43m | 2 tasks | 8 files |
