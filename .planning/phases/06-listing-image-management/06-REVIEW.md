---
phase: 06-listing-image-management
reviewed: 2026-08-05T10:04:37Z
depth: standard
files_reviewed: 32
files_reviewed_list:
  - package.json
  - src/app/globals.css
  - src/app/listings/[id]/edit/page.tsx
  - src/app/my-listings/page.tsx
  - src/app/sell/page.tsx
  - src/components/listing-card.tsx
  - src/components/listing-form.tsx
  - src/components/listing-image-manager.tsx
  - src/components/listings-feed.tsx
  - src/components/my-listing-card.tsx
  - src/config/app-settings.json
  - src/lib/database.types.ts
  - src/lib/image-normalizer.client.ts
  - src/lib/listing-form-workflow.ts
  - src/lib/listing-image-consumers.ts
  - src/lib/listing-image-lifecycle-client.ts
  - src/lib/listing-image-manager.ts
  - src/lib/listing-image-storage.test.ts
  - src/lib/listing-images.test.ts
  - src/lib/listing-images.ts
  - src/lib/listings.test.ts
  - src/lib/listings.ts
  - src/lib/storage/browser-listing-image-storage.ts
  - src/lib/storage/listing-image-storage.ts
  - src/lib/storage/supabase-listing-images.ts
  - supabase/functions/listing-image-cleanup/index.ts
  - supabase/functions/listing-image-cleanup/lifecycle.test.ts
  - supabase/functions/listing-image-cleanup/lifecycle.ts
  - supabase/migrations/20260801000000_add_listing_images_storage.sql
  - supabase/migrations/20260801010000_cut_over_listing_image_contract.sql
  - supabase/tests/hosted-listing-image-cleanup.ts
  - supabase/tests/listing-images-rls.sql
findings:
  critical: 6
  warning: 3
  info: 0
  total: 9
status: issues_found
---

# Phase 06: Code Review Report

**Reviewed:** 2026-08-05T10:04:37Z
**Depth:** standard
**Files Reviewed:** 32
**Status:** issues_found

## Summary

The Phase 06 image-management implementation has six ship-blocking correctness, security, and data-loss defects. Draft media is publicly retrievable, failed registrations leak undeletable objects, cleanup can leave metadata pointing at deleted files, required-image invariants are raceable, transient publication failures create duplicate drafts, and the cut-over migration discards existing image data. Three additional robustness problems affect upload concurrency and untrusted-image handling. The local TypeScript check and 39 Vitest tests pass, but current tests explicitly encode some of the unsafe behavior described below.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Cut-over migration irreversibly drops existing image references

**Classification:** BLOCKER
**File:** `supabase/migrations/20260801010000_cut_over_listing_image_contract.sql:1-3`
**Issue:** The migration drops `listings.image_url` without copying existing non-null values into the new image model or retaining them for a staged backfill. Any deployed listing that already has an image URL loses that data as soon as this migration runs. PostgreSQL cannot recover those values after the column is dropped without restoring a backup.
**Fix:** Add a forward data migration before dropping the column. If remote URLs cannot be represented safely in `listing_images.storage_key`, retain a temporary `legacy_image_url` column and make consumers support it until an object-copy/backfill job has completed and been verified. Drop the legacy column only in a later migration after an explicit zero-unmigrated-row assertion.

### CR-02: Public bucket bypasses draft-image authorization

**Classification:** BLOCKER
**File:** `supabase/migrations/20260801000000_add_listing_images_storage.sql:183-201`
**Issue:** The `listing-images` bucket is configured as public. Public object delivery does not apply the `listing_images` table RLS policies, so anyone who has or learns a draft object's URL can retrieve it even though anonymous and non-owner users are prohibited from reading draft listing/image metadata. The hosted test at `supabase/tests/hosted-listing-image-cleanup.ts:297-305` explicitly asserts this unauthorized draft delivery. UUID paths reduce guessing but are not an authorization boundary; URLs can leak through browser history, logs, screenshots, referrers, or sharing.
**Fix:** Make the bucket private and add a `storage.objects` SELECT policy that permits the owner or permits objects whose listing is active. Generate signed URLs (or authenticated object URLs) through that policy for cards and the owner editor. Update the hosted test to assert that a draft object is denied anonymously and becomes readable only after publication.

### CR-03: Registration failures leave storage objects that users cannot delete

**Classification:** BLOCKER
**File:** `src/lib/storage/supabase-listing-images.ts:81-104`
**Issue:** Upload happens before `register_listing_image`, but the registration error path only throws. The new `compensate-upload` lifecycle action is never invoked anywhere in the browser upload flow. Registration can fail normally because of a network interruption, an over-capacity race, a deleted listing, or an RPC error; in every case the uploaded object remains. Direct browser deletion is intentionally denied, metadata does not exist to expose/manage the object, and the public bucket keeps the orphan retrievable indefinitely.
**Fix:** On every failed/empty registration result, invoke protected `compensate-upload` with the generated key before returning an error. If compensation also fails, persist a server-side cleanup job/outbox rather than silently abandoning the object. Add a test that makes RPC registration fail and asserts the exact uploaded key is removed.

### CR-04: Object-first deletion can leave live records permanently pointing at missing files

**Classification:** BLOCKER
**File:** `supabase/functions/listing-image-cleanup/lifecycle.ts:325-326,350-360`
**Issue:** Both image deletion and listing deletion irreversibly remove storage objects before database metadata/status changes. If metadata deletion or the final status transition fails, the request returns an error while the listing and image rows remain, but their objects are already gone. For an active listing this produces public broken images; for listing deletion it can leave an apparently active listing after all its photos were destroyed. The lifecycle test at lines 308-335 currently confirms this partial-failure state instead of preventing it.
**Fix:** Move database state through an atomic server-side transaction first (for example, mark rows/listings as deleting and enqueue keys in a cleanup outbox), then remove objects idempotently, then finalize metadata/status in a second transaction. Failed object deletion must remain retryable from durable state. Do not represent the old metadata as intact after its object has already been deleted.

### CR-05: Concurrent image deletions violate the required-photo publication invariant

**Classification:** BLOCKER
**File:** `supabase/functions/listing-image-cleanup/lifecycle.ts:296-326`
**Issue:** The function counts images and conditionally demotes an active listing before deleting metadata, but these operations are not serialized. With `images_required=true`, two concurrent requests deleting the two images on an active listing can both observe a count of two, skip the active-to-draft transition, and then each delete one image. The final state is an active public listing with zero images, violating the server-authoritative policy the lifecycle is meant to enforce.
**Fix:** Implement the count, conditional status transition, and metadata reservation/deletion in one PostgreSQL function/transaction that locks the listing row (`FOR UPDATE`) before reading the count. Return the authoritative status from that transaction and perform idempotent object cleanup from durable queued keys.

### CR-06: A transient publication failure strands a saved draft and retry creates duplicates

**Classification:** BLOCKER
**File:** `src/lib/listing-form-workflow.ts:49-82`
**Issue:** `persistDraft` succeeds before publication, but only the specific `image_required` error is converted into a reachable draft outcome. A timeout, Edge Function 5xx, response parsing failure, or other lifecycle error is rethrown after the draft already exists. `ListingForm` then leaves the user on the create form (`src/components/listing-form.tsx:81-112`); pressing “Publish listing” again inserts another draft before retrying publication. This can create one duplicate per retry while telling the user the listing was not saved.
**Fix:** Once `persistDraft` returns an ID, never return to the new-listing insert path. On any publication failure, route to `/listings/{id}/edit?created=draft` with accurate retry guidance (or retain the ID in component state and retry publication against it). Add a test for a generic lifecycle/network rejection followed by retry and assert only one draft is inserted.

## Warnings

### WR-01: Upload controls permit overlapping selections against stale capacity

**Classification:** WARNING
**File:** `src/components/listing-image-manager.tsx:114-132,195-209`
**Issue:** The file input and “Add photos” button remain enabled while files are preparing/uploading. A second selection starts with the render's stale `images` array, reuses operation IDs such as `selected-0`, and can exceed the configured capacity before the first selection commits. The database cap may reject later registrations, but that directly triggers CR-03's orphan-object path and the UI feedback entries overwrite each other.
**Fix:** Track a selection/upload pending flag, disable both controls until the batch settles, and use globally unique operation IDs. Re-read authoritative image metadata after a batch so capacity is not based solely on captured React state.

### WR-02: Unexpected normalization errors become unhandled promises and leave the UI stuck

**Classification:** WARNING
**File:** `src/lib/listing-image-manager.ts:103-147`
**Issue:** `normalize(source, settings)` is outside the per-file `try` block. Canvas creation/drawing, module loading, browser API failures, or an injected normalizer rejection can therefore reject the whole batch. The component deliberately discards the returned promise with `void selectPhotos(event)`, so the rejection is unhandled and the last file remains displayed as “Preparing…” indefinitely.
**Fix:** Wrap normalization and upload together in a per-file `try/catch`, emit an error state for every failure, and add a top-level `try/finally` in `selectPhotos` to restore pending UI state. Add a rejection test rather than testing only `{ ok: false }` normalization results.

### WR-03: Pixel safety limit is checked only after the browser has decoded the image

**Classification:** WARNING
**File:** `src/lib/image-normalizer.client.ts:208-229`
**Issue:** `maxPixels` is intended as a source safety limit, but `createImageBitmap`/the HEIC decoder runs before dimensions are checked. A small highly compressed image with extreme dimensions can force the browser to allocate/decode the oversized bitmap first, causing the tab to stall or crash before the guard executes.
**Fix:** Parse dimensions from bounded source headers before full decode (including HEIC/HEIF metadata), reject dimensions over `maxPixels`, and perform decoding in a worker or similarly isolated context with a hard failure boundary. Keep the post-decode check as defense in depth.

---

_Reviewed: 2026-08-05T10:04:37Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: standard_
