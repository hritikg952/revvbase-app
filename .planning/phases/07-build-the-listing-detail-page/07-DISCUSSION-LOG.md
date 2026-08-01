# Phase 7: Build the listing detail page - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 07-build-the-listing-detail-page
**Areas discussed:** page layout, image treatment, offer entry, owner state, navigation continuity, mobile actions

---

## Page layout

| Option | Description | Selected |
|--------|-------------|----------|
| Photo-led marketplace | Gallery beside title, price, facts, and action on desktop | ✓ |
| Classifieds-dense | Compact gallery with a denser fact-first layout | |
| Editorial minimal | Full-bleed hero with sparse information | |

**User's choice:** Photo-led marketplace.
**Notes:** Keep the page focused on the current vehicle; do not add similar listings.

---

## Image treatment

| Option | Description | Selected |
|--------|-------------|----------|
| Static or conditional carousel | Static for one image; carousel only for multiple images | ✓ |
| Thumbnail gallery | Always show a gallery with thumbnails | |

**User's choice:** Conditional carousel with arrows and no thumbnails.
**Notes:** Use `Read more` for long description text.

---

## Offer entry and owner state

| Option | Description | Selected |
|--------|-------------|----------|
| Public offer CTA | Everyone sees the CTA; anonymous users sign in first | ✓ |
| Signed-in-only CTA | Hide the action until authentication | |

**User's choice:** `Make an offer`; the owner sees `Edit listing` instead.
**Notes:** The offer interaction itself is not part of this phase. Keep a non-functional heart icon for future saved listings.

---

## Navigation continuity

| Option | Description | Selected |
|--------|-------------|----------|
| Restore feed position | Return from a listing to the same feed location/card | ✓ |
| Reset to feed top | Reload the feed from its beginning | |

**User's choice:** Restore feed position.
**Notes:** This applies when navigating back from a deeply scrolled card.

---

## Mobile actions

| Option | Description | Selected |
|--------|-------------|----------|
| Primary CTA only | Sticky footer contains only `Make an offer` | ✓ |
| Price plus CTA | Sticky footer repeats price beside the CTA | |

**User's choice:** Primary CTA only.
**Notes:** Title uses `Make Model · Year`; show whatever location the listing supplied.

---

## the agent's Discretion

- Exact responsive treatment, gallery mechanics, accessibility, and implementation strategy for route/scroll restoration.

## Deferred Ideas

- Messaging/contact, saved listings, related vehicles, finance/inspection layers, and advanced gallery functionality.
