---
phase: 06-listing-image-management
plan: 06
subsystem: release-validation
tags: [supabase, storage, edge-functions, react, tdd, rls, responsive]

requires:
  - phase: 06-listing-image-management
    plan: 05
    provides: Ordered image consumers, protected cleanup, and legacy media cutover
provides:
  - Final automated, hosted, and browser evidence for both required-image modes
  - Structured non-2xx Edge lifecycle error handling for draft-first creation
  - Setting-derived seller guidance and immediate authoritative edit-state messaging
affects: [07-listing-detail-page, release-validation, seller-workflows]

tech-stack:
  added: []
  patterns: [structured FunctionsHttpError parsing, authoritative lifecycle UI projection, two-mode hosted release harness]

key-files:
  created: []
  modified:
    - supabase/tests/hosted-listing-image-cleanup.ts
    - src/lib/listing-images.test.ts
    - src/lib/listing-image-lifecycle-client.ts
    - src/lib/listing-form-workflow.ts
    - src/app/sell/page.tsx
    - src/components/listing-form.tsx
    - src/components/listing-image-manager.tsx
    - src/app/listings/[id]/edit/page.tsx

key-decisions:
  - "Parse structured Edge Function non-2xx bodies from the Supabase FunctionsHttpError context before falling back to the generic SDK message."
  - "Project create and edit copy from the same validated settings and authoritative lifecycle status used by the domain workflow."
  - "Keep public draft objects as accepted MVP behavior while protecting draft listing records and image metadata."

patterns-established:
  - "Seller lifecycle responses update both photo controls and page-level edit messaging without requiring navigation refresh."
  - "Hosted release fixtures exercise both policy values and restore the intended required=false MVP default during cleanup."

requirements-completed: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-05]

coverage:
  - id: D1
    description: "Versioned settings and the approved HEIC dependency enforce source validation and canonical WebP normalization without duplicating component policy."
    requirement: IMG-01
    verification:
      - kind: unit
        ref: "npm test -- src/lib/listing-images.test.ts"
        status: pass
      - kind: other
        ref: "npm ls heic-to --depth=0 and package-lock exact-version assertion"
        status: pass
    human_judgment: false
  - id: D2
    description: "Provider-neutral storage persists ordered owner-bound images while public and non-owner clients cannot read draft records or metadata or forge mutations."
    requirement: IMG-03
    verification:
      - kind: unit
        ref: "src/lib/listing-image-storage.test.ts"
        status: pass
      - kind: integration
        ref: "supabase/tests/hosted-listing-image-cleanup.ts"
        status: pass
    human_judgment: false
  - id: D3
    description: "Both required-image modes publish correctly, final-photo removal reverts to draft, and listing cleanup remains object then metadata then deleted."
    requirement: IMG-04
    verification:
      - kind: unit
        ref: "supabase/functions/listing-image-cleanup/lifecycle.test.ts"
        status: pass
      - kind: integration
        ref: "hosted required=false/true lifecycle and cleanup matrix"
        status: pass
    human_judgment: false
  - id: D4
    description: "Seller photo management, cover progression, setting-aware copy, responsive wrapping, accessible labels/focus, and immediate lifecycle messaging work in the browser."
    requirement: IMG-05
    verification:
      - kind: manual_procedural
        ref: "Approved desktop 1470x681 and mobile 390x844 browser acceptance"
        status: pass
      - kind: unit
        ref: "src/lib/listing-images.test.ts#seller workflow and copy regressions"
        status: pass
    human_judgment: true
    rationale: "Responsive layout, keyboard focus, browser copy, and immediate visual state transitions required human inspection and were approved."

duration: 3d 15h 43m
completed: 2026-08-05
status: complete
---

# Phase 6 Plan 6: Listing image release validation Summary

**Two-mode hosted lifecycle validation and responsive seller UAT now prove secure ordered photos, draft-first publication, permanent cleanup, and setting-consistent UI state.**

## Performance

- **Duration:** 3d 15h 43m elapsed across browser checkpoints
- **Started:** 2026-08-01T18:13:17Z
- **Completed:** 2026-08-05T09:56:05Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Expanded the hosted regression to prove owner draft visibility, anonymous/non-owner record and metadata absence, intentionally public draft-object delivery, cross-owner/cross-listing forged-key denial, all direct destructive/status mutation denials, final-photo draft reversion, and permanent listing cleanup.
- Fixed non-2xx Supabase Edge responses so `image_required` retains its typed draft status and routes a newly persisted no-photo listing to its owner edit page.
- Unified required/optional create guidance and edit-page lifecycle copy with the authoritative workflow status, including immediate publish and final-photo state changes without refresh.
- Completed approved desktop/mobile browser acceptance for optional and required modes, five-photo capacity, cover progression, unsaved-text preservation, keyboard labels/focus, responsive wrapping, draft privacy, publication, reversion, and deletion.

## Task Commits

Task 1 and integration fixes were committed atomically:

1. `2b53f22` — Expand the hosted release matrix.
2. `b3fc3ef` — RED: reproduce non-2xx lifecycle payload loss.
3. `d324b72` — GREEN: preserve structured Edge lifecycle errors.
4. `7633f33` — RED: reproduce stale required-mode workflow copy.
5. `87a989a` — GREEN: synchronize required seller workflow copy and edit state.

Task 2 was the blocking human browser acceptance checkpoint and was explicitly approved on 2026-08-05.

## Files Created/Modified

- `supabase/tests/hosted-listing-image-cleanup.ts` — Full two-policy hosted authorization, visibility, mutation-denial, and cleanup matrix.
- `src/lib/listing-images.test.ts` — Non-2xx lifecycle mapping and required-mode UI-copy behavior regressions.
- `src/lib/listing-image-lifecycle-client.ts` — Structured `FunctionsHttpError.context` parsing with safe fallback.
- `src/lib/listing-form-workflow.ts` — Setting-derived create guidance and status-derived edit-page copy.
- `src/app/sell/page.tsx` — Create guidance from the validated image policy.
- `src/components/listing-form.tsx` — Page-level lifecycle status callback wiring.
- `src/components/listing-image-manager.tsx` — Immediate propagation of protected publish/removal status.
- `src/app/listings/[id]/edit/page.tsx` — Authoritative draft/active heading and visibility messaging.

## Decisions Made

- Kept the Edge Function unchanged because the hosted response body and status were correct; the defect was browser parsing of the SDK's non-2xx error context.
- Kept the public bucket and stable draft object URL behavior explicitly accepted for the MVP; no private staging or promotion scope was added.
- Restored both the versioned JSON and hosted policy mirror to `images.required=false` after completing the required-mode fixture run.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Expanded incomplete hosted mutation evidence**
- **Found during:** Task 1 final matrix audit
- **Issue:** The hosted harness did not directly prove browser object/listing deletion denial, all status-transition directions, cross-listing forged keys, or pre-cleanup object delivery.
- **Fix:** Added isolated hosted assertions for every missing public boundary.
- **Files modified:** `supabase/tests/hosted-listing-image-cleanup.ts`
- **Verification:** The expanded hosted matrix passed repeatedly in both policy modes.
- **Committed in:** `2b53f22`

**2. [Rule 1 - Bug] Preserved structured required-image lifecycle errors**
- **Found during:** Task 2 required-mode browser acceptance
- **Issue:** Supabase placed the typed 409 body on `FunctionsHttpError.context`, but the browser client surfaced only `Edge Function returned a non-2xx status code`, leaving the persisted draft stranded on `/sell`.
- **Fix:** Parse the structured context JSON before generic SDK fallback.
- **Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-image-lifecycle-client.ts`
- **Verification:** RED/GREEN regression, 39/39 full tests, and fresh required-mode browser creation passed.
- **Committed in:** `b3fc3ef`, `d324b72`

**3. [Rule 1 - Bug] Synchronized required-mode copy and post-publish edit state**
- **Found during:** Task 2 required-mode browser acceptance
- **Issue:** `/sell` claimed photos were optional under a required policy, and the edit page retained draft copy after successful publication until refresh.
- **Fix:** Derive create/edit copy from shared policy/status projections and propagate authoritative lifecycle status from the photo manager to the page.
- **Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-form-workflow.ts`, `src/app/sell/page.tsx`, `src/components/listing-form.tsx`, `src/components/listing-image-manager.tsx`, `src/app/listings/[id]/edit/page.tsx`
- **Verification:** RED/GREEN regressions, typecheck/build, and approved fresh browser acceptance passed.
- **Committed in:** `7633f33`, `87a989a`

---

**Total deviations:** 3 auto-fixed (1 missing-critical release proof, 2 browser workflow bugs).
**Impact on plan:** All changes were necessary to make the planned release truths observable and correct; no product scope or infrastructure was added.

## Issues Encountered

- Deno was not installed locally. Node 24's TypeScript-capable `node --test` and direct TypeScript execution ran the same lifecycle and hosted harness assertions without weakening them.
- The installed TDD skill package lacked its referenced `tests.md` and `mocking.md` companions; its available public-seam and RED/GREEN rules were followed.
- Chrome connector file-URL permissions prevented native file handoff, so hosted canonical WebP fixtures exercised the real Storage/RPC boundary; JPEG/PNG/WebP/HEIC normalization and isolated errors remained covered by browser-normalizer tests.
- Chrome confirm automation stalled during the final required-mode pass. Protected final-photo and listing deletion were invoked through the same deployed Edge endpoint and verified through owner, public, metadata, and object projections; the user approved this evidence.

## TDD Gate Compliance

- `b3fc3ef` RED failed specifically because the structured `image_required` body was discarded; `d324b72` GREEN preserved it.
- `7633f33` RED failed specifically because required create/edit copy projections were absent; `87a989a` GREEN added and wired them.
- Final focused result: 31/31 listing-image behavior tests pass.
- Final full result: 39/39 Vitest tests and 14/14 lifecycle tests pass.

## Hosted and Browser Verification

- `supabase migration list` reports all four local/remote migrations in parity.
- The hosted harness passes required=false zero-image publication, required=true rejection/one-image publication, draft record/metadata privacy, accepted public draft object delivery, JWT/ownership/forged-key/direct-mutation denial, final-photo draft safety, and listing-wide cleanup permanence.
- Optional mode passed desktop 1470x681 and mobile 390x844 checks with stock fallback, five-photo capacity, cover progression, numbered remove labels, visible 3px keyboard focus, no overflow, and unsaved-description preservation.
- Required mode passed no-photo draft routing, signed-out absence, direct draft object 200 with private record/metadata, active publication, final-photo draft reversion, republish, deleted-row retention, zero public/metadata rows, and cleaned object response 400.
- Temporary UAT users/listings and remaining generated objects were removed.

## Known Stubs

None.

## Threat Flags

None. The hosted Auth, Storage, RLS, Edge lifecycle, and public draft-object boundaries were declared in the plan threat model and exercised by the release matrix.

## Authentication Gates

None. Existing authorized Supabase CLI access remained valid.

## User Setup Required

None.

## Next Phase Readiness

- Phase 6 is release-ready with optional photos as the restored MVP default and required photos proven as a configuration-only mode.
- Phase 7 can consume ordered cover metadata and active-only public listing projections without legacy media fields.
- Private draft image staging/promotion remains an explicit future hardening consideration, not a Phase 6 blocker.

## Self-Check: PASSED

All eight modified artifacts exist, all five Plan 06-06 commits are present, 39/39 Vitest tests and 14/14 lifecycle tests pass, TypeScript/build pass, migration parity and the hosted two-mode harness pass, and both local and hosted defaults are restored to `images.required=false`.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-05*
