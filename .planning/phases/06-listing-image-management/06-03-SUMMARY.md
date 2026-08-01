---
phase: 06-listing-image-management
plan: 03
subsystem: protected-media-lifecycle
tags: [supabase-edge-functions, jwt, storage-cleanup, tdd, rls]

requires:
  - phase: 06-listing-image-management
    plan: 02
    provides: Draft listings, ordered image metadata, public bucket, owner binding, and policy mirror
provides:
  - JWT-protected, server-authoritative draft publication
  - Final-required-photo draft transition and permanent object-first removal
  - Listing-wide objects-to-metadata-to-deleted cleanup
  - Hosted two-policy lifecycle and security regression harness
affects: [06-04-image-management-ui, 06-05-image-consumers, 06-06-release-validation]

tech-stack:
  added: []
  patterns: [injected lifecycle ports, strict action schema, object-first compensating cleanup, server-only elevated authority]

key-files:
  created:
    - src/lib/listing-image-lifecycle-client.ts
    - supabase/functions/listing-image-cleanup/index.ts
    - supabase/functions/listing-image-cleanup/lifecycle.ts
    - supabase/functions/listing-image-cleanup/lifecycle.test.ts
    - supabase/tests/hosted-listing-image-cleanup.ts
  modified:
    - supabase/tests/listing-images-rls.sql

key-decisions:
  - "Authenticate the caller JWT first, verify listing ownership through the injected lifecycle boundary, and only then use the Edge Function's built-in service-role authority."
  - "Treat object or metadata cleanup failures as retryable while preserving the safest truthful listing state; never attempt to reactivate after a final-photo failure."
  - "Validate exact action fields and authoritative owner/listing/storage-key binding before every destructive operation."

patterns-established:
  - "Lifecycle requests are a closed discriminated union: publish, delete-image, delete-listing, or compensate-upload; policy values are never accepted from clients."
  - "Permanent cleanup always removes Storage objects before metadata and changes listing status only at its mandated safe point."

requirements-completed: [IMG-03, IMG-04]

coverage:
  - id: D1
    description: "Protected publication permits zero photos only when the server policy mirror is false and otherwise preserves the draft until image metadata exists."
    requirement: IMG-04
    verification:
      - kind: unit
        ref: "supabase/functions/listing-image-cleanup/lifecycle.test.ts#publication policy tests"
        status: pass
      - kind: integration
        ref: "supabase/tests/hosted-listing-image-cleanup.ts#required false/true publication"
        status: pass
    human_judgment: false
  - id: D2
    description: "Final required-photo removal transitions active to draft before object and metadata deletion, with retryable safe-state failures."
    requirement: IMG-04
    verification:
      - kind: unit
        ref: "supabase/functions/listing-image-cleanup/lifecycle.test.ts#final-photo ordering and failures"
        status: pass
      - kind: integration
        ref: "supabase/tests/hosted-listing-image-cleanup.ts#final required image removal"
        status: pass
    human_judgment: false
  - id: D3
    description: "Listing deletion removes authoritative objects, then metadata, then retains the listing row as deleted."
    requirement: IMG-03
    verification:
      - kind: unit
        ref: "supabase/functions/listing-image-cleanup/lifecycle.test.ts#listing-wide cleanup sequencing"
        status: pass
      - kind: integration
        ref: "supabase/tests/hosted-listing-image-cleanup.ts#listing-wide cleanup"
        status: pass
    human_judgment: false
  - id: D4
    description: "Missing/invalid JWTs, non-owners, forged keys, policy overrides, and direct browser mutations are rejected."
    requirement: IMG-03
    verification:
      - kind: unit
        ref: "supabase/functions/listing-image-cleanup/lifecycle.test.ts#authorization and payload contracts"
        status: pass
      - kind: integration
        ref: "supabase/tests/hosted-listing-image-cleanup.ts#hosted security assertions"
        status: pass
    human_judgment: false

duration: 21min
completed: 2026-08-01
status: complete
---

# Phase 6 Plan 3: Protected publication and cleanup lifecycle Summary

**A deployed JWT-protected Supabase Edge Function now owns config-driven publication and retry-safe permanent image cleanup with explicit cross-system ordering.**

## Performance

- **Duration:** 21 min
- **Started:** 2026-08-01T17:13:29Z
- **Completed:** 2026-08-01T17:34:19Z
- **Tasks:** 3
- **Files modified:** 6

## Accomplishments

- Added a strict browser lifecycle client and deployed Edge Function that authenticate a real user JWT, verify ownership, read the migration-owned required-image policy, and never expose elevated credentials to browser code.
- Implemented final-photo and listing-wide permanent cleanup with tested draft/object/metadata/deleted ordering plus retryable failure preservation.
- Deployed the Phase 6 migration and function to the linked project, then passed both policy modes, draft visibility, forged/direct-write denial, final-photo safety, and CDN-origin cleanup in the hosted harness.

## Task Commits

Task 1 followed strict RED/GREEN publication slices:

1. `508f094` — RED publication lifecycle contract
2. `6036e05` — GREEN protected draft publication

Task 2 followed strict RED/GREEN cleanup and security slices:

1. `541368e` — RED cleanup ordering contracts
2. `53f54e2` — RED cleanup recovery contracts
3. `063254d` — RED strict lifecycle payload contract
4. `aff9b63` — GREEN permanent cleanup lifecycle and hosted harness
5. `3bbd4ed` — fixed hosted origin-deletion verification after live CDN feedback

## Files Created/Modified

- `src/lib/listing-image-lifecycle-client.ts` — Typed authenticated function invocation with domain status and retryable error mapping.
- `supabase/functions/listing-image-cleanup/index.ts` — CORS-aware JWT verification, server-only privileged adapters, and stable HTTP error responses.
- `supabase/functions/listing-image-cleanup/lifecycle.ts` — Provider-injected publication, image deletion, listing cleanup, compensation, authorization, and ordering rules.
- `supabase/functions/listing-image-cleanup/lifecycle.test.ts` — Fourteen behavior tests covering both policy modes, authorization, sequencing, failure preservation, and payload/key binding.
- `supabase/tests/listing-images-rls.sql` — Required false/true policy-mirror fixtures alongside browser-write denial assertions.
- `supabase/tests/hosted-listing-image-cleanup.ts` — Disposable-user hosted lifecycle, RLS, Storage, JWT, CDN, and cleanup harness.

## Decisions Made

- Used Supabase's built-in `SUPABASE_SERVICE_ROLE_KEY` Edge Function secret; no duplicate secret was created and no privileged value was written to application or repository files.
- Kept caller authentication explicit with `auth.getUser(token)` and performed the owner lookup before any policy, metadata, Storage, or status work.
- Kept public draft-object delivery as the accepted MVP behavior while proving draft listing rows and metadata remain unavailable to anonymous and non-owner callers.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Bypassed stale CDN responses in the hosted deletion probe**
- **Found during:** Task 3 hosted lifecycle harness
- **Issue:** The first hosted run observed a cached stable public URL after the origin object had been deleted, so the six-second probe tested CDN cache retention rather than object permanence.
- **Fix:** Added a unique query parameter to each cleanup probe so the harness verifies origin deletion after cache propagation.
- **Files modified:** `supabase/tests/hosted-listing-image-cleanup.ts`
- **Verification:** The complete linked-project harness passed on rerun.
- **Committed in:** `3bbd4ed`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** The fix strengthened the planned CDN cleanup assertion without changing product behavior or scope.

## Issues Encountered

- Deno is not installed in the local execution environment. The Deno-compatible lifecycle test file was executed directly with Node 24's TypeScript runner (14/14 passing); the deployed Supabase Deno runtime bundled the same lifecycle module successfully, and the hosted function harness passed end to end.
- Supabase CLI warned that Docker was not running, but remote function bundling and deployment completed successfully without Docker.

## TDD Gate Compliance

- Publication RED `508f094` precedes GREEN `6036e05`.
- Cleanup/security RED commits `541368e`, `53f54e2`, and `063254d` precede GREEN `aff9b63`.
- Latest results: lifecycle 14/14, repository Vitest 22/22, TypeScript pass, hosted lifecycle pass.

## Known Stubs

None.

## Authentication Gates

The existing Supabase CLI session authorized the explicitly approved linked-project deployment. No credential was requested in chat, printed, or persisted in repository files.

## User Setup Required

None. The migration is applied, the function is ACTIVE with `verify_jwt: true`, and Supabase's built-in Edge Function secrets provide the server-only service-role credential.

## Next Phase Readiness

- Plan 06-04 can invoke the typed lifecycle client for publish, immediate deletion, and failed-registration compensation without direct browser delete/status authority.
- The policy mirror is restored to `images.required = false`, matching `src/config/app-settings.json`.
- No deployment or security blocker remains for seller photo-management UI work.

## Self-Check: PASSED

All six implementation artifacts, seven TDD/task commits, the linked migration, the ACTIVE JWT-verified function, the local suites, and the hosted lifecycle harness were verified after deployment.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-01*
