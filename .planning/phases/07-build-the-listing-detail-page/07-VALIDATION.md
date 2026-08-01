---
phase: 07
slug: build-the-listing-detail-page
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-08-01
---

# Phase 7 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | Vitest 4.1.10 in the existing Node environment |
| **Config file** | `vitest.config.ts` |
| **Quick run command** | `npm test` |
| **Full suite command** | `npm run typecheck && npm test && npm run build` |
| **Estimated runtime** | Under 60 seconds locally, excluding manual browser checks |

## Sampling Rate

- **After every task commit:** Run the focused Vitest command named in the task, then `npm run typecheck` when route/type changes are involved.
- **After every plan wave:** Run `npm run typecheck && npm test`.
- **Before `$gsd-verify-work`:** Run `npm run typecheck && npm test && npm run build` and complete the documented browser checks.
- **Max feedback latency:** 60 seconds for automated checks.

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Threat Ref | Secure Behavior | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|------------|-----------------|-----------|-------------------|-------------|--------|
| 07-01-01 | 01 | 1 | D-01, D-02, D-06 | T-07-01, T-07-02 | Only active rows and normalized public image descriptors reach the UI; unavailable states are neutral | unit + build | `npm test -- src/lib/listing-detail-images.test.ts && npm run typecheck && npm run build` | ❌ Wave 0 | ⬜ pending |
| 07-01-02 | 01 | 1 | D-01, D-05 | T-07-03 | 0/1/2+ media branches preserve fallback safety; only multi-image controls are interactive | unit + manual keyboard | `npm test -- src/lib/listing-detail-media.test.ts && npm run typecheck` | ❌ Wave 0 | ⬜ pending |
| 07-02-01 | 02 | 2 | D-03, D-04, D-07, D-09, D-10 | T-07-05, T-07-06 | Auth-loading state is not misrepresented; owner/Edit and visitor/offer UI is presentation-only | unit + manual responsive | `npm test -- src/lib/listing-detail-view.test.ts && npm run typecheck` | ❌ Wave 0 | ⬜ pending |
| 07-02-02 | 02 | 2 | D-08 | T-07-04 | `returnTo` accepts only the validated internal listing path in immediate auth success paths | unit + manual auth | `npm test -- src/lib/listing-return.test.ts && npm run typecheck` | ❌ Wave 0 | ⬜ pending |
| 07-03-01 | 03 | 3 | D-11 | T-07-07, T-07-08 | Feed provenance is nonce-bound, short-lived, one-time claimed, and direct/stale visits fail closed to listings | unit + manual browser Back | `npm test -- src/lib/listing-return.test.ts && npm run typecheck` | ❌ Wave 0 | ⬜ pending |
| 07-03-02 | 03 | 3 | D-01–D-11 | T-07-09 | Final user journey retains scope and passes route, accessibility, auth, and return-continuity release evidence | full suite + manual | `npm run typecheck && npm test && npm run build` | Existing suite + Wave 0 files | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

## Wave 0 Requirements

- [ ] `src/lib/listing-detail-images.test.ts` — ordered public-image normalization, malformed records, adapter failure, and placeholder fallback.
- [ ] `src/lib/listing-detail-media.test.ts` — zero/one/many branches and wrapping gallery index behavior.
- [ ] `src/lib/listing-detail-view.test.ts` — description disclosure plus auth-loading, owner, and visitor CTA selection.
- [ ] `src/lib/listing-return.test.ts` — strict internal auth return paths plus nonce creation, exact ID/nonce matching, expiry, one-time claim, consumption, and direct/stale fallback behavior.
- [ ] Existing Vitest configuration covers all automated work; no framework installation or Wave 0 infrastructure change is needed.

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Keyboard gallery controls | D-05 | Current Node Vitest setup does not prove real focus order and browser interaction | For a 2+ photo listing, use Tab then Enter/Space on arrows and indicators; confirm visible focus, selection updates, and wrap behavior. Verify no controls for a single image. |
| Responsive hero and sticky action | D-01, D-10 | Requires real viewport layout | At 600px or narrower, confirm media precedes summary and the sticky area contains only the resolved primary CTA, never price or heart. Check the desktop asymmetric hero separately. |
| Auth round-trip | D-08, D-09 | Requires a real Supabase session state | Signed out: select Make an offer, authenticate, and return to the same listing. Owner: confirm Edit listing. A crafted external/malformed return must land at `/`. |
| Browser and in-app return | D-11 | Browser history, session storage, and rendered-card timing cannot be fully verified in Node | Scroll deeply, open a card, use browser Back and then in-app Back in separate trials; each must reveal the target after the feed renders. Direct, expired, malformed, or nonce-mismatched detail visits must use the listings fallback and never call history Back. |

## Validation Sign-Off

- [ ] Every task has a focused automated check or depends on the Wave 0 files listed above.
- [ ] No three consecutive tasks lack automated verification.
- [ ] Wave 0 provides coverage for all new pure helpers and view-state rules.
- [ ] Automated commands have no watch-mode flags.
- [ ] Feedback latency target is under 60 seconds.
- [ ] `nyquist_compliant: true` is set in frontmatter after execution evidence is complete.

**Approval:** pending
