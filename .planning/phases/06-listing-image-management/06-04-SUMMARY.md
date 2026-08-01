---
phase: 06-listing-image-management
plan: 04
subsystem: seller-image-management-ui
tags: [react, tdd, accessibility, image-upload, draft-lifecycle]

requires:
  - phase: 06-listing-image-management
    plan: 01
    provides: Config-driven normalization, accepted MIME types, capacity, and lifecycle copy
  - phase: 06-listing-image-management
    plan: 02
    provides: Provider-neutral ordered image storage and owner draft persistence
  - phase: 06-listing-image-management
    plan: 03
    provides: Protected publication and permanent image cleanup lifecycle
provides:
  - Draft-first listing creation followed by server-authoritative protected publication
  - Accessible immediate multi-file photo management independent of unsaved listing fields
  - Ordered first-image cover behavior, per-file feedback, protected deletion, and draft republication
affects: [06-05-image-consumers, 06-06-release-validation, 07-listing-detail-page]

tech-stack:
  added: []
  patterns: [public workflow seams, injected provider-neutral ports, server-authoritative UI state, child-form mutation isolation]

key-files:
  created:
    - src/components/listing-image-manager.tsx
    - src/lib/listing-form-workflow.ts
    - src/lib/listing-image-manager.ts
    - src/lib/storage/browser-listing-image-storage.ts
  modified:
    - src/components/listing-form.tsx
    - src/app/listings/[id]/edit/page.tsx
    - src/lib/listing-images.test.ts
    - src/app/globals.css

key-decisions:
  - "Keep draft publication, upload, deletion, and republication behavior in public workflow functions driven by injected ports so tests observe lifecycle effects without coupling to React internals."
  - "Treat every lifecycle success or failure status returned by the protected boundary as authoritative; the UI never writes or infers listing status."
  - "Compose the current Supabase storage adapter in a browser infrastructure factory while keeping provider names, bucket paths, keys, and URL construction out of the manager and domain workflow."

patterns-established:
  - "Immediate photo actions are type=button child interactions with their own state; they never submit, reset, or serialize unsaved listing text fields."
  - "Cover is a read-only projection of durable position order; no reorder or manual-cover affordance exists."

requirements-completed: [IMG-01, IMG-02, IMG-05]

coverage:
  - id: D1
    description: "New listings persist as owner drafts before protected publication, and required-photo or stale-policy draft outcomes remain owner reachable."
    requirement: IMG-05
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#draft-first listing publication"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Mixed file selections preserve ready photos, report independent validation/upload outcomes, enforce configured capacity, and project the first ordered image as Cover."
    requirement: IMG-01
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#immediate listing photo uploads"
        status: pass
    human_judgment: false
  - id: D3
    description: "Protected deletion and republication preserve retryable image state and display the server-returned active or draft lifecycle status."
    requirement: IMG-02
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#authoritative listing photo removal and persisted draft republication"
        status: pass
    human_judgment: false
  - id: D4
    description: "The seller manager presents accessible multi-file controls, 4:3 cover tiles, per-file live feedback, labelled 44px removal targets, and responsive wrapping without reorder controls."
    requirement: IMG-05
    verification:
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Responsive layout, native file-picker behavior, keyboard focus, and assistive-technology announcements require the browser/device acceptance pass reserved for Plan 06-06."

duration: 15min
completed: 2026-08-01
status: complete
---

# Phase 6 Plan 4: Draft-aware seller photo management Summary

**A draft-first seller workflow now manages ordered canonical photos immediately through neutral ports, with accessible per-file feedback and protected server-authoritative publication and deletion outcomes.**

## Performance

- **Duration:** 15 min
- **Started:** 2026-08-01T17:38:19Z
- **Completed:** 2026-08-01T17:52:54Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Replaced direct new-listing activation and the legacy editable Image URL with draft persistence followed by protected publication, including a clear owner-only edit state when photos are required.
- Added an accessible immediate photo manager with config-derived native multi-file input, per-file preparation/upload/errors, ordered cover tiles, five-photo capacity, and no reorder/manual-cover controls.
- Kept deletion and republication server-authoritative so final-photo removal can return the listing to draft without losing retryable photo state or unsaved text fields.

## Task Commits

Task 1 followed a RED/GREEN tracer cycle:

1. `acc8db1` — RED draft publication workflow contract
2. `825f733` — GREEN draft-first protected publication and owner edit state

Task 2 followed three RED/GREEN domain slices plus UI integration:

1. `6e1ca7c` — RED immediate upload, capacity, and cover contracts
2. `c07fa5e` — GREEN provider-neutral independent upload orchestration
3. `3ec2649` — RED protected deletion and final-photo draft contracts
4. `7ad5373` — GREEN retry-safe authoritative photo removal
5. `e2e53ec` — RED protected draft republication contract
6. `1add809` — GREEN authoritative draft republication
7. `a7ead17` — Accessible immediate photo-manager integration

## Files Created/Modified

- `src/components/listing-image-manager.tsx` — Accessible owner photo collection, progress/error states, permanent removal confirmation, and draft publish guidance.
- `src/components/listing-form.tsx` — Draft-first create flow, status-free field updates, legacy Image URL removal, and persisted-listing manager composition.
- `src/app/listings/[id]/edit/page.tsx` — Owner-only draft presentation and post-create guidance without a public-card link.
- `src/lib/listing-form-workflow.ts` — Public draft publication and field-update decision seam.
- `src/lib/listing-image-manager.ts` — Public upload, cover projection, protected removal, and republication behavior seams.
- `src/lib/storage/browser-listing-image-storage.ts` — Browser infrastructure composition for the provider-neutral storage contract.
- `src/lib/listing-images.test.ts` — Twenty-three image and lifecycle behavior tests, including four Plan 06-04 RED/GREEN slices.
- `src/app/globals.css` — Responsive 4:3 photo grid, progress, long-name wrapping, focus, and 44px removal-target styles.

## Decisions Made

- Used pure async workflow functions as the confirmed automated seam and kept React tests focused on compile/build coverage rather than private hooks or component structure.
- Processed selected files sequentially to preserve deterministic database insertion order while still giving every file its own progress and failure outcome.
- Kept the storage adapter selection in an infrastructure composition root so the photo manager and domain orchestration consume only the existing `ListingImageStorage` port.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added explicit public workflow and composition modules**
- **Found during:** Tasks 1 and 2 TDD seam design
- **Issue:** The plan named the component files but did not name a provider-neutral public seam where lifecycle effects could be tested without importing private React implementation details or a provider adapter into UI/domain code.
- **Fix:** Added `listing-form-workflow.ts`, `listing-image-manager.ts`, and `browser-listing-image-storage.ts` for injected workflow behavior and infrastructure-only adapter composition.
- **Files modified:** `src/lib/listing-form-workflow.ts`, `src/lib/listing-image-manager.ts`, `src/lib/storage/browser-listing-image-storage.ts`
- **Verification:** All 23 focused tests, all 31 repository tests, TypeScript, and the production build pass; provider-specific search is clean in the manager component/domain module.
- **Committed in:** `825f733`, `c07fa5e`, `7ad5373`, `1add809`, `a7ead17`

---

**Total deviations:** 1 auto-fixed missing-critical separation.
**Impact on plan:** The added modules make the confirmed TDD and provider-neutral boundaries explicit without expanding product scope.

## Issues Encountered

- The mandatory tracer feedback gate paused after Task 1. The user approved the draft-publication slice, and execution resumed at Task 2 without redoing committed work.
- The installed TDD skill package contained its primary `SKILL.md` but not the companion `tests.md` and `mocking.md` paths named by the execution handoff. The available skill rules and confirmed public seams were applied directly.

## TDD Gate Compliance

- Four failing RED commits precede their corresponding GREEN implementations.
- Focused result: 23/23 `listing-images` tests pass.
- Full result: 31/31 repository tests pass.
- `tsc --noEmit` and the Next.js production build pass.

## Known Stubs

None.

## Authentication Gates

None.

## User Setup Required

None.

## Next Phase Readiness

- Plan 06-05 can consume the first ordered image for public and owner cards and move listing-wide deletion to the protected lifecycle.
- Plan 06-06 still owns responsive/device inspection of zero, one, and five-photo states, native HEIC selection, keyboard focus, and live-region behavior.

## Self-Check: PASSED

All four created artifacts, all nine Plan 06-04 commits, the focused behavior suite, TypeScript gate, provider-isolation scan, and declared UI source criteria were verified against the current worktree.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-01*
