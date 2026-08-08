---
phase: 06-listing-image-management
fixed_at: 2026-08-05T11:02:15Z
review_path: .planning/phases/06-listing-image-management/06-REVIEW.md
iteration: 2
findings_in_scope: 5
fixed: 5
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-08-05T11:02:15Z
**Source review:** `.planning/phases/06-listing-image-management/06-REVIEW.md`
**Iteration:** 2

**Summary:**

- Findings in scope: 5
- Fixed: 5
- Skipped: 0
- Final forward-migration commit: blocked by approval-system usage exhaustion; verified files remain in the isolated worktree

## Fixed Issues

### CR-01: Pending cleanup jobs have no retry consumer

**Files modified:** `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/functions/listing-image-cleanup/lifecycle.test.ts`, `supabase/functions/listing-image-cleanup-retry/index.ts`, `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`, `src/lib/listing-image-lifecycle-client.ts`, `src/lib/listing-image-manager.ts`, `src/lib/listing-image-consumers.ts`
**Commits:** RED `48efe48`; GREEN `0b5d10a`; immediate-failure transition `dc69a74`; final forward-migration correction pending commit
**Applied fix:** Added an idempotent retry consumer, atomic `FOR UPDATE SKIP LOCKED` claims, five-attempt ceiling, exponential backoff, terminal dead state, immediate and scheduled trigger paths, and client-visible `cleanupPending`. Transient-failure coverage proves a pending job can later complete. **Fixed: requires human verification.**

### CR-02: Failed registration compensation is still best-effort

**Files modified:** `src/lib/listing-image-storage.test.ts`, `src/lib/storage/supabase-listing-images.ts`, `src/lib/storage/browser-listing-image-storage.ts`, `src/lib/storage/listing-image-storage.ts`, `src/lib/listing-image-lifecycle-client.ts`, `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`
**Commits:** RED `8c1abfe`; GREEN `5bcd703`; final forward-migration correction pending commit
**Applied fix:** Durable cleanup intent is created before upload. Registration atomically cancels the intent through a database trigger; failed or unreachable compensation leaves the pre-existing job retryable. Reservation failure stops before object upload and returns an honest typed error.

### WR-01: Concurrent photo responses can overwrite final draft status

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-image-manager.ts`, `src/components/listing-image-manager.tsx`
**Commits:** RED `2e375db`; GREEN `f88a018`
**Applied fix:** Photo-deletion status reconciliation is monotonic: an authoritative draft result cannot be overwritten by a later-arriving stale active result, including the parent status callback. **Fixed: requires human verification.**

### WR-02: Retained-draft publication failure notice is never shown

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/listing-form-workflow.ts`, `src/app/listings/[id]/edit/page.tsx`
**Commits:** RED `dda1d3a`; GREEN `d4d6c09`
**Applied fix:** Generic publication failure routes with bounded reason `created=publish-failed`; the edit page maps that reason to local retry guidance and renders it with an accessible alert role.

### WR-03: JPEG and HEIC can bypass the pre-decode pixel guard

**Files modified:** `src/lib/listing-images.test.ts`, `src/lib/image-normalizer.client.ts`
**Commits:** RED `1d8b02e`; GREEN `8a5860f`
**Applied fix:** JPEG inspection traverses the full configured source-byte budget, including late SOF markers. HEIC/HEIF inspection performs bounded, depth-limited ISO-BMFF traversal through `meta`/`iprp`/`ipco` and reads `ispe` dimensions. Unproven dimensions fail closed before `createImageBitmap` or `heic-to`; the post-decode ceiling remains defense-in-depth.

## Verification

- Full Vitest: 50/50 passed.
- Lifecycle tests: 16/16 passed.
- TypeScript: passed (`tsc --noEmit`).
- Production build: passed.
- Migration dry-run: passed; exactly `20260805010000_consume_listing_image_cleanup_jobs.sql` is pending.
- Hosted deployment: not attempted, per iteration-2 instruction.
- Existing hosted `20260805000000` migration was detected as already applied and is restored byte-for-byte in the worktree.

## Operational Handoff

The isolated branch is `gsd-reviewfix/06-39912` at `dc69a74`, with worktree `/tmp/sv-06-reviewfix-ZLXpKI`. Approval-system usage exhaustion blocked the final commit. Before merging, commit these two worktree files together:

- `supabase/migrations/20260805000000_durable_listing_image_cleanup.sql`
- `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`

Do not merge `dc69a74` alone because it still contains edits to the already-applied migration; the uncommitted pair restores history and moves iteration-2 changes into the forward migration.

---

_Fixed: 2026-08-05T11:02:15Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 2_
