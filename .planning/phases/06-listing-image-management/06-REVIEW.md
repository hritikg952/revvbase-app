---
phase: 06-listing-image-management
reviewed: 2026-08-08T17:36:16Z
depth: deep
files_reviewed: 5
files_reviewed_list:
  - src/lib/storage/listing-image-storage.ts
  - src/lib/storage/supabase-listing-images.ts
  - src/lib/listing-image-storage.test.ts
  - supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql
  - supabase/tests/hosted-listing-image-cleanup.ts
findings:
  critical: 1
  warning: 0
  info: 0
  total: 1
status: issues_found
---

# Phase 06: Registration-Fence Re-review Report

**Reviewed:** 2026-08-08T17:36:16Z
**Depth:** deep
**Files Reviewed:** 5
**Status:** issues_found

## Summary

The new `BEFORE INSERT` trigger takes a row lock on the cleanup job. This correctly serializes a registration against a concurrent claim: a still-reserved/pending intent can register and is cancelled by the existing `AFTER INSERT` trigger, while a currently `processing` claim makes registration fail. The owner and canonical-key validation remain in `register_listing_image`, and the client exposes that current processing rejection as a typed retryable error.

One actionable race remains. Registration verifies `storage.objects` before it reaches the new insert trigger. A cleanup worker can delete that object and transition the job to `completed` in that interval; the trigger permits `completed`, so the insert succeeds with metadata for a missing object. The new hosted test covers only the still-`processing` state and therefore misses this ordering.

Focused regression tests passed (`src/lib/listing-image-storage.test.ts`, 10 tests), as did `npx tsc --noEmit`.

## Narrative Findings (AI reviewer)

## Critical Issues

### CR-01: Completed claimed cleanup can still race successful registration

**Classification:** BLOCKER
**File:** `supabase/migrations/20260805010000_consume_listing_image_cleanup_jobs.sql:45`
**Issue:** `register_listing_image` verifies that the object exists before executing its `INSERT` ([`20260801000000_add_listing_images_storage.sql:284`](../../migrations/20260801000000_add_listing_images_storage.sql#L284)). Between that check and this trigger, a claimed/reclaimed cleanup worker can remove the object and call `complete_listing_image_cleanup`, which changes the job to `completed` ([`20260805010000_consume_listing_image_cleanup_jobs.sql:65`](../../migrations/20260805010000_consume_listing_image_cleanup_jobs.sql#L65)). The fence rejects only `processing`; it accepts `completed`, then inserts metadata even though the external object has been deleted. Thus the claimed-cleanup protocol is not fully fenced and can still produce a successful registration pointing at a deleted object.

**Fix:** Treat every cleanup state that can mean deletion has already occurred or remains authorized (`processing`, `completed`, and conservatively `dead` after a leased worker) as a registration fence. Return the established serialization failure for `processing` and a non-success/retryable failure for terminal deletion states. Keep `reserved` and `pending` allowed so the `AFTER INSERT` cancellation path still works. Add a hosted regression that claims a job, removes its fixture object, completes the job, then calls `register_listing_image`; assert failure and no metadata row.

```sql
if cleanup_state = 'processing' then
  raise serialization_failure using message = 'Cleanup is in progress; retry registration.';
elsif cleanup_state in ('completed', 'dead') then
  raise serialization_failure using message = 'Cleanup has removed this upload; retry registration.';
end if;
```

---

_Reviewed: 2026-08-08T17:36:16Z_
_Reviewer: the agent (gsd-code-reviewer)_
_Depth: deep_
