---
phase: 06-listing-image-management
fixed_at: 2026-08-05T10:23:23Z
review_path: .planning/phases/06-listing-image-management/06-REVIEW.md
iteration: 1
findings_in_scope: 9
fixed: 7
skipped: 2
status: complete
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-08-05T10:23:23Z
**Source review:** `.planning/phases/06-listing-image-management/06-REVIEW.md`
**Iteration:** 1

**Summary:**

- Findings in scope: 9
- Fixed: 7
- Skipped: 2
- Hosted deployment: migration and Edge Function deployed; full hosted harness passed

## Fixed Issues

### CR-03: Registration failures leave storage objects that users cannot delete

**Files modified:** `src/lib/listing-image-storage.test.ts`, `src/lib/storage/supabase-listing-images.ts`, `src/lib/storage/browser-listing-image-storage.ts`, `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/functions/listing-image-cleanup/index.ts`, `supabase/migrations/20260805000000_durable_listing_image_cleanup.sql`
**Commits:** RED `4992e44`; GREEN `56a030b` plus durable server cleanup in `ca3debb`
**Applied fix:** Registration failure invokes protected compensation for the exact uploaded key. Compensation first creates a durable cleanup job, so provider failure is recorded for retry instead of silently abandoning the object.

### CR-04: Object-first deletion can leave live records permanently pointing at missing files

**Files modified:** `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/functions/listing-image-cleanup/lifecycle.test.ts`, `supabase/functions/listing-image-cleanup/index.ts`, `supabase/migrations/20260805000000_durable_listing_image_cleanup.sql`
**Commits:** RED `3c30dbd`; GREEN `ca3debb`
**Applied fix:** Added a transactional PostgreSQL reservation boundary and durable cleanup outbox. Listing visibility and image metadata change atomically before idempotent storage cleanup; failed object deletion remains pending with attempt/error state. **Fixed: requires human verification.**

### CR-05: Concurrent image deletions violate the required-photo publication invariant

**Files modified:** `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/functions/listing-image-cleanup/lifecycle.test.ts`, `supabase/functions/listing-image-cleanup/index.ts`, `supabase/migrations/20260805000000_durable_listing_image_cleanup.sql`, `supabase/tests/hosted-listing-image-cleanup.ts`
**Commits:** RED `d3d7471`; GREEN `ca3debb`, hosted concurrency coverage `addf6f6`
**Applied fix:** Transactional deletion and publication functions lock the listing row with `FOR UPDATE` before counting images or changing status. Concurrent final-photo deletions serialize and preserve the required-image draft invariant. **Fixed: requires human verification.**

### CR-06: A transient publication failure strands a saved draft and retry creates duplicates

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-form-workflow.ts`
**Commits:** RED `c16dade`; GREEN `18b03c7`
**Applied fix:** Once draft persistence returns an ID, every publication failure routes to that draft's edit page with retry guidance instead of returning to the create/insert path. **Fixed: requires human verification.**

### WR-01: Upload controls permit overlapping selections against stale capacity

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-image-manager.ts`, `src/components/listing-image-manager.tsx`
**Commits:** RED `e01b3c6`; GREEN `d143979`
**Applied fix:** Upload batches now have globally unique operation IDs, controls are disabled while a batch is pending, pending state is restored in `finally`, and authoritative metadata is reloaded after the batch.

### WR-02: Unexpected normalization errors become unhandled promises and leave the UI stuck

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-image-manager.ts`
**Commits:** RED `88693c8`; GREEN `c5549e1`
**Applied fix:** Normalizer rejections are caught per file, converted to file-specific error states, and do not prevent later files in the batch from completing.

### WR-03: Pixel safety limit is checked only after the browser has decoded the image

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/image-normalizer.client.ts`
**Commits:** RED `989aca0`; GREEN `1ed9ae1`
**Applied fix:** Added bounded pre-decode dimension parsing for PNG, JPEG, and WebP with an overflow-safe pixel check, while retaining the post-decode guard. HEIC/HEIF deliberately retains only the post-decode check because this implementation does not prove its nested ISO-BMFF metadata graph safe.

## Skipped Issues

### CR-01: Cut-over migration irreversibly drops existing image references

**File:** `supabase/migrations/20260801010000_cut_over_listing_image_contract.sql:1`
**Reason:** Not applicable to this approved one-way cutover. The user-authorized hosted inspection found zero non-null `listings.image_url` values before the migration, so there was no legacy data to backfill or retain. Recreating the retired schema would contradict the approved cutover.
**Original issue:** Dropping the legacy column could lose existing non-null image references.

### CR-02: Public bucket bypasses draft-image authorization

**File:** `supabase/migrations/20260801000000_add_listing_images_storage.sql:183`
**Reason:** Deferred accepted risk under locked Phase 06 decision D-02 in `06-CONTEXT.md`. The acceptance contract intentionally permits stable public draft object delivery while draft listing records and metadata remain private; signed URLs/private staging are deferred.
**Original issue:** Anyone with a leaked public draft object URL can retrieve the object.

## Verification

- Full Vitest: 44/44 passed.
- Lifecycle tests: 15/15 passed, including durable failure state and concurrent deletion.
- TypeScript: passed (`tsc --noEmit`).
- Production build: passed after replacing the isolated worktree's external dependency symlink with a local APFS clone.
- Migration dry-run and deployment: passed; exactly `20260805000000_durable_listing_image_cleanup.sql` was applied.
- Migration parity: all five local and remote migrations match.
- Hosted Edge Function deployment: passed for `listing-image-cleanup` on project `qokumaemcqwkqhrxyolc`.
- Hosted two-mode/security/cleanup harness: passed, including the concurrent final-image deletion assertion.
- `images.required=false`: restored by the hosted harness cleanup block.

---

_Fixed: 2026-08-05T10:23:23Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 1_
