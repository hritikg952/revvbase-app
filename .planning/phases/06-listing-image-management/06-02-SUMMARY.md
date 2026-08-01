---
phase: 06-listing-image-management
plan: 02
subsystem: media-storage
tags: [supabase-storage, postgres, rls, draft-lifecycle, provider-adapter, vitest]

requires:
  - phase: 06-listing-image-management
    plan: 01
    provides: Canonical WebP files and config-driven image limits
  - phase: 03-seller-listing-crud
    provides: Owner-scoped listing creation and editing
provides:
  - Provider-neutral canonical image upload and ordered metadata read contract
  - Supabase public-bucket adapter with opaque key and URL derivation
  - Draft-aware listings, ordered image metadata, registration RPC, and owner/public RLS split
  - Migration-owned policy mirror linked to versioned application settings
affects: [06-03-protected-lifecycle, 06-04-image-management-ui, 06-05-image-consumers]

tech-stack:
  added: []
  patterns: [provider-neutral storage port, owner-listing-key binding, serialized metadata allocation, server-authoritative policy mirror]

key-files:
  created:
    - src/lib/storage/listing-image-storage.ts
    - src/lib/storage/supabase-listing-images.ts
    - src/lib/listing-image-storage.test.ts
    - supabase/migrations/20260801000000_add_listing_images_storage.sql
    - supabase/tests/listing-images-rls.sql
  modified:
    - src/lib/database.types.ts
    - src/lib/listings.ts
    - src/lib/listings.test.ts

key-decisions:
  - "Store provider-opaque keys in metadata and derive stable public URLs only inside the Supabase adapter."
  - "Reserve object and metadata deletion plus every status transition for protected server lifecycle authority."
  - "Mirror the versioned JSON source, schema version, required flag, capacity, MIME, and byte cap in one migration-owned singleton."

patterns-established:
  - "UI/domain callers consume ListingImageStorage; only its Supabase adapter knows bucket names, key construction, RPC calls, or provider errors."
  - "Registration locks the owned listing before count/order allocation and binds the object owner, listing, canonical key, and maximum count."

requirements-completed: [IMG-02, IMG-03, IMG-04]

coverage:
  - id: D1
    description: "Canonical files upload and return ordered application metadata through a provider-neutral contract with stable public URLs."
    requirement: IMG-03
    verification:
      - kind: unit
        ref: "src/lib/listing-image-storage.test.ts#listing image storage contract"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Browser listing creation is draft-only, with explicit draft/active/deleted application mappings."
    requirement: IMG-04
    verification:
      - kind: unit
        ref: "src/lib/listing-image-storage.test.ts#draft listing lifecycle contract"
        status: pass
    human_judgment: false
  - id: D3
    description: "Database and Storage policies enforce active-only public metadata, owner drafts, bound registration, count allocation, and denied browser lifecycle/destructive writes."
    requirement: IMG-03
    verification:
      - kind: integration
        ref: "supabase/tests/listing-images-rls.sql"
        status: unknown
    human_judgment: true
    rationale: "The executable SQL regression is committed, but hosted migration/RLS execution is deliberately gated in Plan 06-03."
  - id: D4
    description: "A source-linked singleton mirrors images.required and the server-enforced static image policy values."
    requirement: IMG-04
    verification:
      - kind: integration
        ref: "supabase/tests/listing-images-rls.sql#deployed mirror release checklist"
        status: unknown
    human_judgment: true
    rationale: "The migration fixture is complete; the linked-project assertion runs after the planned deployment checkpoint."

duration: 14min
completed: 2026-08-01
status: complete
---

# Phase 6 Plan 2: Storage-neutral draft persistence Summary

**A provider-neutral listing-photo port now persists ordered canonical images through a Supabase adapter backed by draft-aware RLS, bound registration, and a server-owned configuration mirror.**

## Performance

- **Duration:** 14 min
- **Started:** 2026-08-01T16:56:29Z
- **Completed:** 2026-08-01T17:10:15Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Added a storage-provider port whose Supabase adapter exclusively owns bucket access, canonical key generation, metadata registration, public URL derivation, and raw provider failures.
- Added draft-only listing creation, explicit three-state application mapping, ordered `listing_images`, serialized five-image allocation, and owner/listing/object-bound registration.
- Added public-active versus owner-draft RLS, denied direct status/destructive writes, and a source-linked singleton that mirrors the deployed static image policy.

## Task Commits

Task 1 was delivered as approved vertical TDD slices:

1. `4445532` — RED canonical upload contract
2. `302f454` — GREEN canonical image upload adapter
3. `d68a5c4` — RED ordered image reads
4. `2bb19b6` — GREEN ordered image reads
5. `9b750f6` — RED draft listing creation
6. `c3f77d2` — GREEN draft listing creation
7. `0c0a0ec` — RED database/Storage policy assertions
8. `2a95d15` — GREEN draft-aware persistence migration

Task 2 continued after the tracer approval:

1. `2ba1358` — RED explicit status mapping
2. `4d3c914` — GREEN explicit status mapping
3. `27739b5` — RED lifecycle and configuration-mirror matrix
4. `1c0174d` — GREEN source-linked policy mirror
5. `8d373fc` — completed browser write-denial regressions

## Files Created/Modified

- `src/lib/storage/listing-image-storage.ts` — Provider-neutral upload/list contract, domain metadata, and stable error taxonomy.
- `src/lib/storage/supabase-listing-images.ts` — Supabase bucket upload, registration RPC, ordered reads, URL derivation, and provider-error isolation.
- `src/lib/listing-image-storage.test.ts` — Behavioral adapter and draft lifecycle contracts.
- `src/lib/database.types.ts` — Explicit listing lifecycle guard and database image-row type.
- `src/lib/listings.ts` — Draft-only browser listing payload.
- `src/lib/listings.test.ts` — Existing listing payload regression aligned with the draft lifecycle.
- `supabase/migrations/20260801000000_add_listing_images_storage.sql` — Forward-only draft, metadata, bucket, RLS, RPC, and policy-mirror migration.
- `supabase/tests/listing-images-rls.sql` — Transactional owner/non-owner/anonymous security and lifecycle assertions.

## Decisions Made

- Kept draft object delivery public as explicitly accepted MVP behavior; only draft records and metadata are owner-restricted.
- Granted browsers object upload/select only. No browser object DELETE/UPDATE or metadata write authority exists; cleanup belongs to Plan 06-03's protected lifecycle endpoint.
- Used a security-definer registration RPC with parent-row locking so concurrent uploads cannot bypass count or ordering invariants.
- Stored no provider URL in Postgres. The adapter derives stable delivery URLs from opaque metadata keys, keeping an R2 implementation compatible with the same domain contract.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Updated the pre-existing listing payload regression for draft creation**
- **Found during:** Task 1 draft creation GREEN
- **Issue:** The Phase 3 regression still required new browser-created listings to be `active`, contradicting the newly enforced draft lifecycle and causing the full suite to fail.
- **Fix:** Changed the expected persisted status to `draft` while preserving all existing owner and field assertions.
- **Files modified:** `src/lib/listings.test.ts`
- **Verification:** Focused listing tests and the full 22-test suite pass.
- **Committed in:** `c3f77d2`

---

**Total deviations:** 1 auto-fixed bug.
**Impact on plan:** The correction aligns the existing regression with D-11; no product scope was added.

## Issues Encountered

- The mandatory interactive tracer gate paused expansion after Task 1. The user approved the working slice, and Task 2 resumed without redoing committed work.
- Supabase CLI telemetry cannot write to its home-directory cache in this sandbox. No hosted migration was attempted; executable SQL validation remains at the explicitly planned Plan 06-03 deployment gate.

## TDD Gate Compliance

- Every behavior-adding slice has a failing RED commit followed by its GREEN implementation commit.
- The final focused result is 4/4 passing tests; the full repository result is 22/22 passing tests.
- TypeScript validation passes with `tsc --noEmit`.

## Known Stubs

None. Hosted SQL execution is a planned deployment checkpoint, not an implementation stub.

## Authentication Gates

None.

## User Setup Required

None for this plan. Supabase deployment and protected Edge Function credentials are intentionally deferred to Plan 06-03.

## Next Phase Readiness

- Plan 06-03 can build publication and permanent cleanup against the policy singleton, ordered metadata, and server-only lifecycle authority established here.
- The migration and SQL harness must be deployed/executed at Plan 06-03's blocking hosted checkpoint before UI image management begins.

## Self-Check: PASSED

All five created artifacts, all thirteen TDD/task commits, the focused contract suite, and TypeScript validation were verified after summary creation.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-01*
