---
phase: 06-listing-image-management
fixed_at: 2026-08-08T17:55:00Z
review_path: .planning/phases/06-listing-image-management/06-REVIEW.md
iteration: 3
findings_in_scope: 4
fixed: 4
skipped: 0
status: all_fixed
---

# Phase 06: Code Review Fix Report

**Fixed at:** 2026-08-08T17:55:00Z
**Source review:** `.planning/phases/06-listing-image-management/06-REVIEW.md`
**Iteration:** 3

**Summary:**

- Findings in scope: 4
- Fixed: 4
- Skipped: 0

## Fixed Issues

### CR-01: A worker interruption strands claimed cleanup jobs forever

**Files modified:** `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`, `supabase/functions/listing-image-cleanup/lifecycle.test.ts`, `supabase/tests/hosted-listing-image-cleanup.ts`
**Commits:** RED `1a607fa`; GREEN `80e6ee9`
**Applied fix:** Processing claims now expire after five minutes. Reclaims consume the bounded attempt budget, terminal expired claims become dead, and backoff remains based on the claimed attempt. The hosted regression simulates a crash after claim and verifies the job can be reclaimed.

### CR-02: The scheduled retry consumer can be omitted permanently when Vault is not pre-seeded

**Files modified:** `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`, `supabase/tests/hosted-listing-image-cleanup.ts`
**Commit:** `80e6ee9`
**Applied fix:** The migration now fails with an explicit secure-provisioning error when either required Vault secret is missing; once present it replaces the named cron job idempotently. The hosted check asserts that `listing-image-cleanup-retry` is installed. No credentials were read, printed, persisted, or deployed.

### CR-03: An eligible upload pre-intent can delete an object while registration is in flight

**Files modified:** `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql`, `supabase/functions/listing-image-cleanup/index.ts`, `supabase/functions/listing-image-cleanup/lifecycle.ts`, `supabase/functions/listing-image-cleanup/lifecycle.test.ts`, `supabase/tests/hosted-listing-image-cleanup.ts`
**Commits:** RED `1a607fa`; GREEN `80e6ee9`
**Applied fix:** Upload intents start as non-claimable `reserved` rows. Compensation explicitly activates only reserved jobs after registration failure, while the registration trigger atomically cancels the reservation. Hosted coverage confirms a worker cannot claim the registration-race object and the registered object remains available. **Fixed: requires human verification.**

### WR-01: WebP with an unproven bounded header can bypass the pre-decode pixel guard

**Files modified:** `src/lib/image-normalizer.client.ts`, `src/lib/listing-images.test.ts`
**Commits:** RED `1a607fa`; GREEN `80e6ee9`
**Applied fix:** Every accepted source type now fails closed before decoding when bounded metadata inspection cannot prove dimensions. The late WebP regression verifies `createImageBitmap` is never called.

## Verification

- Full Vitest: passed, 51 tests.
- TypeScript: passed (`tsc --noEmit`).
- Production build: passed in the normal checkout.
- Lifecycle Deno command: not run; `deno` is not installed in this environment.
- Migration dry-run: attempted with `supabase migration list --local`; blocked because no local PostgreSQL project is reachable. The hosted test contains the required installation assertion but was not deployed or run.
- Hosted deployment: not attempted.

---

_Fixed: 2026-08-08T17:55:00Z_
_Fixer: the agent (gsd-code-fixer)_
_Iteration: 3_
