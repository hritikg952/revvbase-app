---
phase: 06-listing-image-management
plan: 01
subsystem: media
tags: [image-normalization, webp, heic, canvas, vitest, configuration]

requires:
  - phase: 03-seller-listing-crud
    provides: Owner-scoped listing creation and editing flows
  - phase: 04-public-listings-feed
    provides: Existing listing image placeholder behavior
provides:
  - Versioned and runtime-validated static image application settings
  - Browser-only source signature validation and canonical WebP normalization
  - Dynamically loaded, reviewed HEIC/HEIF decoding through heic-to 1.5.2
affects: [06-02-storage-persistence, 06-04-photo-management-ui, 06-05-image-consumers]

tech-stack:
  added: [heic-to@1.5.2]
  patterns: [typed JSON settings boundary, decode-and-re-encode image validation, bounded quality loop, format-specific dynamic import]

key-files:
  created:
    - src/config/app-settings.json
    - src/lib/listing-images.ts
    - src/lib/image-normalizer.client.ts
    - src/lib/listing-images.test.ts
  modified:
    - package.json
    - package-lock.json

key-decisions:
  - "Use a 20 MB and 40 megapixel source safety ceiling, then store only canonical WebP with a 2560 px long edge and 1 MB byte cap."
  - "Pin the human-approved heic-to package at exactly 1.5.2 and load it only for detected HEIC/HEIF bytes."
  - "Treat decoded bytes, output MIME, WebP signature, and output size as authoritative instead of filenames or claimed MIME alone."

patterns-established:
  - "Image settings are parsed once from versioned JSON and consumed through typed helpers rather than duplicated UI literals."
  - "Untrusted source files cross one normalizer boundary and produce either a verified canonical File or a file-scoped error result."

requirements-completed: [IMG-01, IMG-02]

coverage:
  - id: D1
    description: "Static JSON controls image requirement copy, capacity, accepted formats, safety ceilings, canonical output, and display settings."
    requirement: IMG-01
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#listing image settings"
        status: pass
      - kind: other
        ref: "npm run typecheck"
        status: pass
    human_judgment: false
  - id: D2
    description: "Native JPEG, PNG, and WebP inputs are signature-checked, decoded, resized, and iteratively encoded to a verified WebP no larger than 1 MB."
    requirement: IMG-02
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#listing image normalization"
        status: pass
    human_judgment: false
  - id: D3
    description: "HEIC and HEIF inputs dynamically load the reviewed decoder and enter the same canonical WebP pipeline with file-scoped failures."
    requirement: IMG-02
    verification:
      - kind: unit
        ref: "src/lib/listing-images.test.ts#routes HEIC and HEIF through the reviewed decoder"
        status: pass
    human_judgment: true
    rationale: "The automated seam proves routing and failure behavior, while real codec/device compatibility remains a Plan 06-06 physical-browser smoke check."

duration: 24min
completed: 2026-08-01
status: complete
---

# Phase 6 Plan 1: Config-driven image normalization Summary

**Validated JSON image rules now drive a browser-only JPEG/PNG/WebP/HEIC pipeline that emits only signature-verified WebP files within the configured 1 MB and 2560 px bounds.**

## Performance

- **Duration:** 24 min
- **Started:** 2026-08-01T16:27:55Z
- **Completed:** 2026-08-01T16:51:49Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments

- Centralized required-image lifecycle copy, five-image capacity, accepted source formats, source safety limits, canonical output rules, and display values in validated versioned JSON.
- Added a non-mutating browser normalizer that detects actual source bytes, bounds decoded dimensions, resizes once, and iteratively encodes a verified WebP at or below 1 MB.
- Added exact-version HEIC/HEIF support using the human-approved `heic-to@1.5.2` dynamic import without affecting native JPEG/PNG/WebP decoding.

## Task Commits

Each TDD slice was committed atomically:

1. **Task 1 RED: Image settings contract** - `0b19112` (test)
2. **Task 1 GREEN: Validated application settings** - `4ff8994` (feat)
3. **Task 1 RED: Native normalization contract** - `597f8b7` (test)
4. **Task 1 GREEN: Native WebP normalizer** - `d9a3420` (feat)
5. **Task 2 RED: HEIC normalization contract** - `98bc6f9` (test)
6. **Task 2 GREEN: Approved HEIC decoder integration** - `0530523` (feat)

## Files Created/Modified

- `src/config/app-settings.json` - Versioned upload, normalization, and display settings.
- `src/lib/listing-images.ts` - Runtime parser, typed settings, picker acceptance, capacity, and lifecycle-copy helpers.
- `src/lib/image-normalizer.client.ts` - Source signature detection, native/dynamic HEIC decoding, bounded Canvas WebP pipeline, and result contract.
- `src/lib/listing-images.test.ts` - Behavior-focused settings and normalizer tests using browser-boundary fakes.
- `package.json` - Exact `heic-to` runtime dependency.
- `package-lock.json` - Reproducible dependency resolution and integrity.

## Decisions Made

- Used the researched 20 MB and 40 megapixel safety ceilings and 2560 px long-edge target as rebuild-time settings, keeping future tuning outside components.
- Accepted `heic-to@1.5.2` only after the blocking review confirmed its repository, current release history, TypeScript declarations, package scripts, and LGPL-3.0 license.
- Required source magic bytes to agree with any claimed MIME and required canonical output to have both `image/webp` MIME and a WebP RIFF signature.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Used a Vitest-resolvable relative JSON import**
- **Found during:** Task 1 settings GREEN
- **Issue:** The existing Vitest config does not define the TypeScript `@/` alias, so importing settings through that alias prevented the focused suite from loading.
- **Fix:** Kept the public module location unchanged and imported the adjacent config with a relative path.
- **Files modified:** `src/lib/listing-images.ts`
- **Verification:** `npm test -- src/lib/listing-images.test.ts` and `npm run typecheck`
- **Committed in:** `4ff8994`

**2. [Rule 3 - Blocking] Restored parseable per-phase plan position**
- **Found during:** Plan close-out
- **Issue:** `STATE.md` had no `Plan: N of M` field, so the required state advancement command could not determine the next plan.
- **Fix:** Added the canonical compound plan field and reran the state transition, which advanced Phase 6 to Plan 2 of 6.
- **Files modified:** `.planning/STATE.md`
- **Verification:** `state.advance-plan` returned `previous_plan: 1`, `current_plan: 2`, `total_plans: 6`.
- **Committed in:** plan metadata commit

**3. [Rule 2 - Missing Critical] Added the Phase 6 requirements register**
- **Found during:** Plan close-out
- **Issue:** Plans and roadmap referenced `IMG-01` through `IMG-05`, but `REQUIREMENTS.md` did not define them, preventing required traceability updates.
- **Fix:** Added the five Phase 6 acceptance requirements, moved image management out of the obsolete broad deferral, and marked the two Plan 06-01 requirements complete through the state tool.
- **Files modified:** `.planning/REQUIREMENTS.md`
- **Verification:** `requirements.mark-complete IMG-01 IMG-02` reported both IDs marked complete with a complete write set.
- **Committed in:** plan metadata commit

---

**Total deviations:** 3 auto-fixed (2 blocking issues, 1 missing critical tracking item).
**Impact on plan:** Runtime behavior remains within scope; the additional fixes make tests resolvable and restore deterministic phase/requirements tracking.

## Issues Encountered

- Execution paused at the mandatory package-legitimacy gate. The user approved exactly `heic-to@1.5.2`; no package was installed before approval.

## TDD Gate Compliance

- RED commits precede every GREEN implementation commit: `0b19112` → `4ff8994`, `597f8b7` → `d9a3420`, and `98bc6f9` → `0530523`.
- Latest focused result: 14/14 tests passed.
- Latest full result: 18/18 tests passed.
- TypeScript validation passed with `tsc --noEmit`.

## Known Stubs

None. Real-device HEIC codec verification is an explicitly scheduled Phase 6 final acceptance check, not a code stub.

## Authentication Gates

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Plan 06-02 can consume the canonical `File` result and typed settings without knowing decoder or Canvas details.
- Real iPhone HEIC and cross-browser codec behavior remains scheduled for the Phase 6 final device/browser smoke gate.

## Self-Check: PASSED

All six owned files, all six TDD commits, the 14-test focused suite, and TypeScript validation were verified after summary creation.

---
*Phase: 06-listing-image-management*
*Completed: 2026-08-01*
