---
phase: 06
slug: listing-image-management
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-01
---

# Phase 06 — Validation Strategy

> Per-phase validation contract for image-upload planning and implementation.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 |
| **Config file** | `vitest.config.ts` |
| **Focused task-loop commands** | `npm test -- src/lib/listing-images.test.ts && npm run typecheck`; `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck`; `deno test supabase/functions/listing-image-cleanup/cleanup.test.ts` |
| **Final-only release command** | `npm test && deno test supabase/functions/listing-image-cleanup/cleanup.test.ts && npm run typecheck && npm run build && supabase migration list && deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` |
| **Focused feedback target** | Under 60 seconds per task loop; the full release command is deliberately final-only. |

---

## Sampling Rate

- **After every normalization/UI task:** Run `npm test -- src/lib/listing-images.test.ts && npm run typecheck`.
- **After every storage-contract task:** Run `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck`.
- **After every Edge Function task:** Run `deno test supabase/functions/listing-image-cleanup/cleanup.test.ts`.
- **At the blocking hosted-deployment checkpoint:** Run `deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` after migration, secret configuration, and function deployment.
- **Before `$gsd-verify-work`:** Run the final-only release command; do not use it as a task-loop feedback check.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | IMG-01 | T-06-01 | Config-derived optional/max/byte settings normalize native photo formats and return per-file errors. | unit | `npm test -- src/lib/listing-images.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | IMG-02, IMG-03 | T-06-03 | Provider-neutral upload and canonical-key registration allow public reads/owner writes while forged owner/listing keys and browser delete/status bypasses fail. | unit | `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck` | ❌ W0 | ⬜ pending |
| 06-02-02 | 02 | 2 | IMG-04 | T-06-04 | Edge cleanup validates JWT ownership, removes objects before metadata, then soft-deletes the listing; failure preserves retryable state. | Deno unit | `deno test supabase/functions/listing-image-cleanup/cleanup.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-03 | 02 | 2 | IMG-03, IMG-04 | T-06-03, T-06-04 | Deployed function harness establishes owner/non-owner sessions, proves public-before/private-after delivery, forged-key rejection, direct delete/status denials, and retained soft-deleted listing. | hosted integration | `deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | IMG-05 | T-06-07 | Photo manager states preserve unsaved fields and report independent add/delete outcomes. | unit + manual visual | `npm test -- src/lib/listing-images.test.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 4 | IMG-03, IMG-04, IMG-05 | T-06-10 | Cards select ordered cover/placeholder and listing removal exclusively invokes protected cleanup followed by soft deletion. | unit | `npm test -- src/lib/listing-images.test.ts && npm run typecheck` | ❌ W0 | ⬜ pending |
| 06-05-01 | 05 | 5 | IMG-01–IMG-05 | T-06-14 | Final-only release suite proves direct delete/status denial, forged-key protection, public object unavailability, image-metadata removal, and retained soft-deleted listing after protected cleanup. | final-only full + hosted | `npm test && deno test supabase/functions/listing-image-cleanup/cleanup.test.ts && npm run typecheck && npm run build && supabase migration list && deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/lib/listing-images.test.ts` — static config parsing, source/canonical validation, and cover/placeholder selection.
- [ ] `src/lib/listing-image-storage.test.ts` — contract/adapter orchestration, compensation, and deletion behavior with a mocked Storage client.
- [ ] `supabase/functions/listing-image-cleanup/cleanup.test.ts` — injected Storage/database mocks proving object-before-row ordering and failure preservation.
- [ ] `supabase/tests/hosted-listing-image-cleanup.ts` — executable Deno harness with two browser sessions that uploads a test object, invokes the deployed cleanup function, proves forged-key/direct-delete/direct-status-update denials, and verifies image cleanup plus a retained deleted-status listing.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HEIC/HEIF conversion | IMG-01 | Requires a real device/browser codec path and an approved decoder dependency. | On iPhone Safari and Chrome/Android, select JPEG, PNG, WebP, and HEIC where supported; confirm successful canonical upload or a precise conversion error with existing photos unchanged. |
| Responsive image manager states | IMG-05 | Visual hierarchy and tile wrapping need viewport inspection. | Verify 0, 1, and 5 photos at desktop and ≤600px widths; inspect long filenames, progress/error messages, keyboard focus, and stock fallback. |
| Hosted Storage and cleanup security | IMG-03, IMG-04 | RLS, Edge Function JWT validation, and real object bytes require the linked Supabase project. | Run the executable hosted harness; verify anonymous public delivery, owner add, forged-key denial, different-user denial, direct owner DELETE/direct deleted-status-update denial, cap denial, object/metadata cleanup, and retained deleted-status listing. |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks lack automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags.
- [ ] Focused task-loop feedback latency is under 60 seconds; the full release command ran only at the final gate.
- [ ] `nyquist_compliant: true` set after implementation validation.

**Approval:** pending
