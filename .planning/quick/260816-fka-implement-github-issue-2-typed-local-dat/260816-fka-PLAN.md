---
quick_id: 260816-fka
description: Implement GitHub issue #2 typed local Indian two-wheeler catalog and cascading listing-form selects
status: ready
---

# Quick Task 260816-fka Plan

## Objective

Replace the listing form's make/model text entry with an accessible, typed local catalog flow while preserving the existing `ListingFormValues`, payload, and validation contracts. A seller selects a brand and then an available model; pre-existing edit records outside the catalog remain selectable and saveable.

## Source Audit

| Source | Required outcome | Coverage |
|---|---|---|
| GitHub issue #2 | Typed `VehicleModel` and `VehicleBrand` catalog for 15–20 active Indian two-wheeler brands and core models | Task 1 |
| GitHub issue #2 | Brand selector stores a brand ID; dependent model selector uses the selected brand and is disabled before selection | Task 2 |
| GitHub issue #2 | Maintain an explicit quarterly catalog-maintenance note | Task 1 |
| Existing listing contract | Preserve submitted make/model strings, validation, and edit compatibility | Tasks 1–2 |
| Existing test convention | Add focused Vitest coverage without a new test framework or package | Task 1 |

<tasks>

<task type="tracer" tdd="true">
  <name>Task 1: Add a typed local vehicle catalog and compatibility resolver</name>
  <files>src/lib/data/vehicles.ts, src/lib/data/vehicles.test.ts</files>
  <behavior>
    - The exported `VehicleModel` has `id`, `name`, and a `fuelType` constrained to the existing `FuelType` union; `VehicleBrand` has `id`, `name`, and `models`.
    - The catalog contains 15–20 currently active Indian two-wheeler brands, each with core model entries and stable, unique identifiers.
    - Lookup helpers resolve a brand by its stable ID and resolve a selected model from that brand without relying on array position.
    - A catalog-selection helper preserves an existing listing's make/model as a retained option when either value is absent from the catalog, so a controlled edit form never loses or rewrites legacy values.
  </behavior>
  <action>Create `src/lib/data/vehicles.ts` as the sole local catalog source. Export the exact `VehicleModel` and `VehicleBrand` interfaces, a readonly catalog, and pure lookup/selection helpers for the form. Include 15–20 active India-market brands covering established petrol manufacturers and active EV makers, with several recognizable core models per brand, stable slug-like IDs, and each model's accurate existing `FuelType` value. Add a concise source comment that the catalog must be reviewed quarterly for active brands and models. Keep this module independent of React and database access. Before implementation, add `vehicles.test.ts` with failing Vitest cases for the public type/data invariants, ID-based brand/model lookup, and preservation of a legacy make/model outside the catalog; then implement until green.</action>
  <verify>
    <automated>npm test -- src/lib/data/vehicles.test.ts</automated>
  </verify>
  <done>The typed catalog exposes the required interfaces and stable lookup helpers, covers 15–20 active brands with core models, documents quarterly maintenance, and its focused tests prove normal and legacy edit resolution.</done>
</task>

<task type="auto">
  <name>Task 2: Wire accessible cascading selectors into the listing form</name>
  <files>src/components/listing-form.tsx, src/lib/listings.test.ts</files>
  <read_first>src/components/listing-form.tsx, src/lib/listings.ts, src/lib/data/vehicles.ts, src/lib/data/vehicles.test.ts</read_first>
  <action>Replace only the Make and Model `FormInput` controls with labelled native selects backed by the catalog helpers. Maintain component state for the selected brand ID separately from `ListingFormValues`; initialize it from an edit listing's make when a catalog match exists. The brand selector must render catalog brands by ID and, on a new selection, set the existing `make` form field to the brand name, clear the existing `model` field, and expose that brand's models. The model selector must be disabled until a usable brand is selected, render model IDs from that selected brand, and map a selection back into the existing `model` string field; apply the selected model's catalog fuel type through the existing typed update path. For edit listings whose make or model is not catalogued, use the resolver's retained option so the current values remain visible, selectable, and submit unchanged until the seller makes a different selection. Preserve the vehicle-type and fuel-type controls, `validateListing`, `toListingPayload`, labels, error rendering, and all existing save paths. Extend the existing listings contract tests only as needed to assert the payload still trims and persists catalog-derived make/model strings; do not introduce a test library or alter the database schema.</action>
  <verify>
    <automated>npm test -- src/lib/data/vehicles.test.ts src/lib/listings.test.ts &amp;&amp; npm run typecheck &amp;&amp; npm run build</automated>
  </verify>
  <done>Sellers can choose a catalog brand and then its model through accessible native selects; the model selector is unavailable before brand choice, catalog fuel data is reflected in form state, and both catalogued and non-catalogued edit values save through the unchanged listing payload contract.</done>
</task>

</tasks>

<verification>
Run the focused catalog and listing-contract tests, then run `npm run typecheck` and `npm run build`. Confirm the create form starts with no usable model selector and an existing listing with an unknown make or model can be saved without changing its make/model text.
</verification>

<success_criteria>
- `src/lib/data/vehicles.ts` exports `VehicleModel { id, name, fuelType }` and `VehicleBrand { id, name, models }` plus the catalog lookup contract used by the form.
- The catalog contains 15–20 active Indian two-wheeler brands and a quarterly maintenance note.
- The listing form tracks brand ID independently, maps brand/model selections into the existing string payload fields, and disables the model selector until a brand is available.
- Legacy edit values absent from the catalog remain available and do not break validation or save behavior.
- Focused Vitest coverage, TypeScript checking, and production build pass.
</success_criteria>

<output>
Create `.planning/quick/260816-fka-implement-github-issue-2-typed-local-dat/260816-fka-SUMMARY.md` when implementation is complete.
</output>
