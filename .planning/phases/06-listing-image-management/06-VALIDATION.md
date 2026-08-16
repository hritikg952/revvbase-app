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
| **Focused task-loop commands** | `npm test -- src/lib/listing-images.test.ts && npm run typecheck`; `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck`; `deno test supabase/functions/listing-image-cleanup/lifecycle.test.ts` |
| **Final-only release command** | `npm test && deno test supabase/functions/listing-image-cleanup/lifecycle.test.ts && npm run typecheck && npm run build && supabase migration list && deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` |
| **Focused feedback target** | Under 60 seconds per task loop; the full release command is deliberately final-only. |

---

## Sampling Rate

- **After every normalization/UI task:** Run `npm test -- src/lib/listing-images.test.ts && npm run typecheck`.
- **After every storage-contract task:** Run `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck`.
- **After every Edge Function task:** Run `deno test supabase/functions/listing-image-cleanup/lifecycle.test.ts`.
- **At the blocking hosted-deployment checkpoint:** Run `deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` after migration, secret configuration, and function deployment.
- **Before `$gsd-verify-work`:** Run the final-only release command; do not use it as a task-loop feedback check.

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 06-01-01 | 01 | 1 | IMG-01 | T-06-01 | Config-derived required-image/max/byte settings normalize native photo formats and return per-file errors. | unit | `npm test -- src/lib/listing-images.test.ts` | ❌ W0 | ⬜ pending |
| 06-02-01 | 02 | 2 | IMG-02, IMG-03 | T-06-03 | Provider-neutral upload and draft-only listing creation bind keys to owner/listing; public listing/metadata reads exclude drafts while public draft object URLs are accepted MVP behavior, and direct status changes fail. | unit + SQL | `npm test -- src/lib/listing-image-storage.test.ts && npm run typecheck` | ❌ W0 | ⬜ pending |
| 06-03-01 | 03 | 3 | IMG-04 | T-06-04 | Protected lifecycle activation allows zero images only when the mirrored setting is false, requires a persisted image when true, and final-photo removal cannot leave an active required listing empty. | Deno unit | `deno test supabase/functions/listing-image-cleanup/lifecycle.test.ts` | ❌ W0 | ⬜ pending |
| 06-03-02 | 03 | 3 | IMG-03, IMG-04 | T-06-03, T-06-04 | Deployed harness proves both setting modes, owner draft visibility, no-public-draft-record/metadata reads, accepted public draft object delivery, forged-key/direct-mutation denial, and cleanup ordering. | hosted integration | `deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` | ❌ W0 | ⬜ pending |
| 06-04-01 | 04 | 4 | IMG-05 | T-06-07 | Create/edit controls keep draft records and metadata owner-only in the application, present config-derived publication state, and preserve unsaved text through photo operations; public draft object delivery is accepted MVP behavior. | unit + manual visual | `npm test -- src/lib/listing-images.test.ts` | ❌ W0 | ⬜ pending |
| 06-05-01 | 05 | 5 | IMG-03, IMG-04, IMG-05 | T-06-10 | Cards exclude drafts, select cover/placeholder, and listing deletion exclusively invokes protected lifecycle cleanup. | unit | `npm test -- src/lib/listing-images.test.ts && npm run typecheck` | ❌ W0 | ⬜ pending |
| 06-06-01 | 06 | 6 | IMG-01–IMG-05 | T-06-17 | Final-only suite proves both required-image modes, no-public-draft-record/metadata behavior, accepted public draft object delivery, direct mutation denial, forged-key protection, and protected deletion sequencing. | final-only full + hosted | `npm test && deno test supabase/functions/listing-image-cleanup/lifecycle.test.ts && npm run typecheck && npm run build && supabase migration list && deno run --allow-env --allow-net supabase/tests/hosted-listing-image-cleanup.ts` | ❌ W0 | ⬜ pending |

---

## Wave 0 Requirements

- [ ] `src/lib/listing-images.test.ts` — static config parsing, source/canonical validation, and cover/placeholder selection.
- [ ] `src/lib/listing-image-storage.test.ts` — contract/adapter orchestration, compensation, and deletion behavior with a mocked Storage client.
- [ ] `supabase/functions/listing-image-cleanup/lifecycle.test.ts` — injected database/Storage mocks proving both publication modes, final-photo draft reversion, object-before-row listing cleanup, and failure behavior.
- [ ] `supabase/tests/hosted-listing-image-cleanup.ts` — executable Deno harness with two browser sessions and both policy fixtures that proves no-public-draft-record/metadata reads, accepted public draft object delivery, publish preconditions, forged-key/direct-delete/direct-status-update denials, final-photo safety, and retained deleted-status cleanup.

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| HEIC/HEIF conversion | IMG-01 | Requires a real device/browser codec path and an approved decoder dependency. | On iPhone Safari and Chrome/Android, select JPEG, PNG, WebP, and HEIC where supported; confirm successful canonical upload or a precise conversion error with existing photos unchanged. |
| Responsive image manager states | IMG-05 | Visual hierarchy and tile wrapping need viewport inspection. | Verify 0, 1, and 5 photos at desktop and ≤600px widths; inspect long filenames, progress/error messages, keyboard focus, and stock fallback. |
| Hosted Storage and lifecycle security | IMG-03, IMG-04 | RLS, Edge Function JWT validation, status transitions, and real object bytes require the linked Supabase project. | Run the executable hosted harness in both policy modes; verify owner draft visibility, anonymous/public draft record and metadata absence, intentionally public draft object delivery, permitted zero-image activation only while required is false, rejection while true until an image persists, final-photo draft reversion, forged-key denial, different-user denial, direct owner DELETE/direct status-update denial, cap denial, object/metadata cleanup, and retained deleted-status listing. |

---

## Validation Sign-Off

- [ ] All tasks have automated verification or Wave 0 dependencies.
- [ ] Sampling continuity: no three consecutive tasks lack automated verification.
- [ ] Wave 0 covers all missing test references.
- [ ] No watch-mode flags.
- [ ] Focused task-loop feedback latency is under 60 seconds; the full release command ran only at the final gate.
- [ ] `nyquist_compliant: true` set after implementation validation.

**Approval:** pending
