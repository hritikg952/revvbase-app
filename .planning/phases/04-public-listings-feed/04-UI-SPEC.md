---
phase: 4
slug: public-listings-feed
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-30
---

# Phase 4 — UI Design Contract

## Design System

Use the approved Phase 2 CSS system, typography, spacing scale, and palette. Listing cards use white surfaces, a 16px radius, restrained border/shadow, and a 4:3 image area.

## Spacing Scale

Grid gap is 24px desktop and 16px narrow; card content uses 20–24px padding; hero-to-feed gap is 48px.

## Typography

Prices use 28px/750. Vehicle names use 20px/700. Supporting facts use 14–15px with sufficient contrast.

## Color

Retain cream page background, white cards, ink text, dark green hero, and orange only for primary CTA/focus. Status and metadata remain neutral.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Sell your two-wheeler |
| Feed heading | Fresh listings |
| Empty state heading | No vehicles listed yet |
| Empty state body | Be the first seller on Revvbase and help start the marketplace. |
| Error state | Listings couldn't load. Check your connection and try again. |
| Retry action | Try again |

## UI Considerations

Applicable state considerations resolved: 7 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Listings grid | ✅ covered | Skeleton-like cards reserve layout while the request is pending. |
| empty | Listings grid | ✅ covered | Documented empty copy and seller CTA replace the grid. |
| error | Listings grid | ✅ covered | Documented error copy and retry control replace the grid. |
| one item | Listings grid | ✅ covered | A single card remains bounded and does not stretch across the full desktop width. |
| many items | Listings grid | ✅ covered | Responsive auto-fill grid preserves consistent card widths. |
| missing/broken image | Listing card | ✅ covered | Local stock placeholder is used for null and failed image URLs. |
| long text | Listing card | ✅ covered | Names and cities wrap/clamp without hiding price or causing overflow. |

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
