---
phase: 06-listing-image-management
plan: 05
subsystem: listing-image-consumers
tags: [react, supabase, postgres, rls, tdd, lifecycle]

requires:
  - phase: 06-listing-image-management
    plan: 02
    provides: Ordered provider-neutral image metadata, public active reads, and owner draft reads
  - phase: 06-listing-image-management
    plan: 03
    provides: Protected publication and permanent image/listing cleanup lifecycle
  - phase: 06-listing-image-management
    plan: 04
    provides: Draft-first seller workflows and immediate photo management
provides:
  - Active-only public cards with first-position cover selection and stock fallback
  - Draft/active owner management with protected listing cleanup and retry-safe UI state
  - Deployed removal of the legacy listings.image_url contract
affects: [06-06-release-validation, 07-listing-detail-page]

tech-stack:
  added: []
  patterns: [query-boundary media projection, defense-in-depth lifecycle filtering, server-authoritative destructive outcomes]

key-files:
  created:
    - src/lib/listing-image-consumers.ts
    - supabase/migrations/20260801010000_cut_over_listing_image_contract.sql
  modified:
    - src/lib/listing-images.test.ts
    - src/lib/listings.ts
    - src/lib/database.types.ts
    - src/components/listing-card.tsx
    - src/components/listings-feed.tsx
    - src/components/my-listing-card.tsx
    - src/app/my-listings/page.tsx
    - supabase/tests/listing-images-rls.sql

key-decisions:
  - "Filter lifecycle state both in Supabase queries and pure consumer projections so public consumers never request draft image metadata even if a query result is malformed."
  - "Treat only a protected lifecycle response with status=deleted as permission to remove an owner card; failures retain the listing with retry guidance."
  - "Remove listings.image_url after direct hosted inspection proved there were zero non-null legacy values and the user explicitly approved the one-way cutover."

patterns-established:
  - "Cards consume query-boundary view models containing an ordered cover URL, never database storage keys or the legacy media field."
  - "Owner destructive controls derive state only from the lifecycle endpoint and never mutate listing status directly."

requirements-completed: [IMG-03, IMG-04, IMG-05]

coverage:
  - id: D1
    description: "Public cards receive only active listings and render the first ordered image or the stock placeholder without consulting legacy media."
    requirement: IMG-03
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#public listing image consumers"
        status: pass
      - kind: integration
        ref: "supabase/tests/listing-images-rls.sql#anonymous active-only listing and image relation assertions"
        status: pass
    human_judgment: false
  - id: D2
    description: "Owner management includes draft and active records, excludes deleted rows, and removes cards only after protected cleanup returns deleted."
    requirement: IMG-05
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#owner listing image consumers"
        status: pass
      - kind: integration
        ref: "supabase/tests/listing-images-rls.sql#owner draft visibility and direct lifecycle mutation denial"
        status: pass
    human_judgment: false
  - id: D3
    description: "The linked database has no listings.image_url column and ordered listing_images metadata is the sole application media contract."
    requirement: IMG-04
    verification:
      - kind: integration
        ref: "supabase migration list + hosted information_schema legacy_column_count=0"
        status: pass
      - kind: unit
        ref: "src/lib/listing-images.test.ts#does not construct a legacy image URL in a listing mutation payload"
        status: pass
    human_judgment: false
  - id: D4
    description: "Public cover fallback, draft labels, disabled deletion controls, and retry alerts render accessibly in the browser."
    requirement: IMG-05
    verification:
      - kind: other
        ref: "npm run build"
        status: pass
    human_judgment: true
    rationale: "Visual fallback behavior, confirmation dialogs, focus, and pending-control presentation require the browser acceptance pass reserved for Plan 06-06."

duration: 14min
completed: 2026-08-01
status: complete
---

# Phase 6 Plan 5: Ordered image consumer cutover Summary

**Public and owner listing consumers now use ordered application-owned photo metadata, while protected cleanup is authoritative and the unused legacy image column is removed from the deployed schema.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-01T17:56:44Z
- **Completed:** 2026-08-01T18:10:19Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments

- Added active-only public card projection with first-position cover selection, stock fallback, meaningful alt text, explicit active filtering in both the query and consumer boundary, and no legacy media reads.
- Added owner draft/active collection projection and protected listing deletion that keeps the UI intact on cleanup failure and removes it only after an authoritative deleted result.
- Inspected the linked project, found zero non-null legacy image values, received explicit user approval, deployed the forward-only column removal, and passed hosted RLS/visibility regression.

## Task Commits

Task 1 followed four RED/GREEN domain slices plus React integration:

1. `bc44955` — RED public active cover/placeholder projection
2. `dc62d78` — GREEN ordered public cover projection
3. `1f1f263` — RED owner draft/active projection
4. `e63fe73` — GREEN owner lifecycle projection
5. `7dfd097` — RED protected listing deletion success contract
6. `ce363f1` — GREEN authoritative deleted-status handling
7. `dbb8bed` — RED protected deletion failure recovery
8. `135e9c9` — GREEN retry-safe owner state preservation
9. `2d2ea90` — RED legacy mutation-payload isolation
10. `46bdfab` — GREEN legacy media removal from application mutations
11. `dc85c52` — React public/owner consumer integration

Task 2 applied the approved hosted schema cutover:

1. `5a8ac82` — Forward-only legacy column removal and hosted visibility regression

## Files Created/Modified

- `src/lib/listing-image-consumers.ts` — Public and owner card projections plus protected listing-deletion behavior.
- `src/lib/listing-images.test.ts` — Active cover, placeholder, owner draft/active, deletion success/failure, and legacy payload contracts.
- `src/components/listing-card.tsx` — Ordered cover rendering with accessible stock fallback after load errors.
- `src/components/listings-feed.tsx` — Explicit active-only query and metadata hydration through the storage adapter.
- `src/components/my-listing-card.tsx` — Draft-aware editing and protected permanent listing cleanup.
- `src/app/my-listings/page.tsx` — Owner-only draft/active query and immediate card removal after protected success.
- `src/lib/listings.ts` — Listing form/payload contract without legacy media construction.
- `src/lib/database.types.ts` — Post-cutover listing type without `image_url`.
- `supabase/migrations/20260801010000_cut_over_listing_image_contract.sql` — Deployed one-way legacy column and constraint removal.
- `supabase/tests/listing-images-rls.sql` — Hosted legacy absence, public active-only relation, owner draft visibility, bucket-public scope, and mutation-denial regression.

## Decisions Made

- Kept image hydration behind the existing browser storage composition root so React and consumer workflows receive neutral image objects and never construct provider URLs.
- Degraded metadata-read failures to the same stock placeholder frame rather than failing an otherwise valid listing feed.
- Used the expanded permanent deletion confirmation for every owner listing because protected cleanup is listing-wide and may remove photos even when current metadata could not be loaded.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added a public consumer workflow seam**
- **Found during:** Task 1 TDD execution
- **Issue:** The plan named React files but no public seam for testing active/draft filtering, ordered cover selection, or authoritative deletion without coupling tests to React internals.
- **Fix:** Added `src/lib/listing-image-consumers.ts` with injected lifecycle behavior and pure public/owner projections.
- **Files modified:** `src/lib/listing-image-consumers.ts`, `src/lib/listing-images.test.ts`
- **Verification:** Four RED/GREEN slices pass through the confirmed user-visible/domain seam; full tests and TypeScript pass.
- **Committed in:** `dc62d78`, `e63fe73`, `ce363f1`, `135e9c9`

**2. [Rule 2 - Missing Critical] Removed remaining legacy media construction before schema cutover**
- **Found during:** Task 1 application integration
- **Issue:** The visible Image URL control was already gone, but `ListingFormValues` and `toListingPayload` still carried and wrote an empty `image_url`, contradicting the ordered-metadata-only contract.
- **Fix:** Removed the legacy field, validation, form mapping, and mutation payload property before dropping the database column.
- **Files modified:** `src/lib/listings.ts`, `src/lib/listing-images.test.ts`
- **Verification:** The RED payload-isolation test fails against the old contract and passes after removal; no production source references remain.
- **Committed in:** `2d2ea90`, `46bdfab`

---

**Total deviations:** 2 auto-fixed missing-critical boundaries.
**Impact on plan:** Both changes were required to make the planned test seams and sole-media-source guarantee real; no product scope was added.

## Issues Encountered

- The required one-way migration paused at its blocking decision. A direct linked-database query found zero non-null legacy values, after which the user selected `approve-cutover`.
- The installed TDD skill package exposed its primary `SKILL.md` but did not contain the referenced companion `tests.md` and `mocking.md`; the available seam and vertical-slice rules were followed directly.

## TDD Gate Compliance

- Five RED commits precede their corresponding GREEN implementation commits.
- Focused result: 28/28 `listing-images` tests pass.
- Full result: 36/36 repository tests pass.
- TypeScript and the Next.js production build pass.

## Hosted Verification

- `supabase db push` deployed migration `20260801010000` successfully.
- `supabase migration list` reports all four local/remote migrations in parity.
- The transactional hosted SQL regression returned `Listing image RLS assertions passed`.
- A final linked `information_schema` query returned `legacy_column_count = 0`.

## Known Stubs

None.

## Threat Flags

None. The schema change, query trust boundary, public draft-object scope, and protected lifecycle boundary were all declared in the plan threat model.

## Authentication Gates

None. Existing authorized Supabase CLI access was valid.

## User Setup Required

None.

## Next Phase Readiness

- Plan 06-06 can run final browser/device acceptance against one unambiguous ordered-image contract.
- Responsive cover fallback, owner draft labels, confirmation dialogs, pending controls, and retry presentation remain intentionally queued for Plan 06-06 human/browser verification.

## Self-Check: PASSED

Both created artifacts exist, all twelve Plan 06-05 production/TDD commits exist, the focused/full test suites pass, TypeScript and production build pass, migration parity is current, hosted RLS assertions pass, and the linked legacy column count is zero.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-01*
