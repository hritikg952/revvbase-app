---
quick_id: 260816-fka
status: complete
subsystem: listings
tags: [catalog, listing-form, accessibility, vitest]
---

# Quick Task 260816-fka Summary

Implemented a typed, quarterly-reviewed local Indian two-wheeler catalog and accessible cascading brand/model selectors without changing the existing listing payload or validation contract.

## Delivered

- Added an 18-brand catalog with stable brand/model IDs, fuel types, ID lookups, and legacy-value resolution in `src/lib/data/vehicles.ts`.
- Replaced listing make/model text inputs with labelled native selects. The model control is disabled until a catalog brand is selected, and catalog model selection updates the existing typed fuel field.
- Preserved unknown makes and models in edit forms as retained select options, so they remain visible and save unchanged.
- Added focused Vitest coverage for catalog invariants, ID lookup, legacy compatibility, and catalog-derived payload strings.

## Verification

- `npm test -- src/lib/data/vehicles.test.ts src/lib/listings.test.ts` — passed (8 tests)
- `npm run typecheck` — passed
- `npm run build` — passed

## Commits

- `f88a8fe` — `test(260816-fka): add failing vehicle catalog tests`
- `fc6bdad` — `feat(260816-fka): add typed vehicle catalog`
- `e83b74b` — `feat(260816-fka): add cascading vehicle selectors`

## Deviations

None — implemented as planned.

## Self-Check: PASSED

Verified the summary and all three implementation commits exist locally.
