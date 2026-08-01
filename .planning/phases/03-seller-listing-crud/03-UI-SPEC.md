---
phase: 3
slug: seller-listing-crud
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-30
---

# Phase 3 — UI Design Contract

## Design System

| Property | Value |
|----------|-------|
| Tool | Existing Phase 2 CSS system |
| Preset | not applicable |
| Component library | none |
| Icon library | none required |
| Font | Geist Sans/system fallback |

## Spacing Scale

Use the Phase 2 4px-based scale. Form groups use 16px internal and 32px sectional spacing; management cards use 24px padding.

## Typography

Use Phase 2 roles. Form legends use 20px/700; helper and error text use 14px/1.45.

## Color

Use the Phase 2 palette. Orange is reserved for create/save actions, and #B42318 only for confirmed soft deletion and errors. Deleted status uses neutral grey, not destructive red.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Publish listing |
| Save edit | Save changes |
| Empty state heading | You haven't listed a vehicle yet |
| Empty state body | Create your first listing and it will appear in the public marketplace. |
| Error state | We couldn't save your listing. Review the fields and try again. |
| Destructive confirmation | Delete listing: This removes it from public browsing and cannot be undone here. |

## UI Considerations

Applicable state considerations resolved: 7 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| validation | Listing form | ✅ covered | Invalid fields show specific inline messages and focus remains usable. |
| loading | Form and owner list | ✅ covered | Pending controls disable duplicate mutations and reads show a visible status. |
| error | Form and owner list | ✅ covered | Network/database errors offer a retry path without clearing entered values. |
| empty | Owner list | ✅ covered | The documented empty-state copy links directly to `/sell`. |
| zero values | Odometer and previous owners | ✅ covered | Valid zero values are preserved and distinguished from missing values. |
| long text | Description and make/model | ✅ covered | Inputs enforce schema limits and cards wrap without overflow. |
| destructive | Delete action | ✅ covered | Soft deletion requires confirmation and removes the row from active presentation. |

## Registry Safety

No registry blocks or third-party UI code are used.

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-30
