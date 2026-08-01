# Phase 7: Build the listing detail page - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Build a responsive, photo-led public listing-detail page for an existing two-wheeler listing. It must present the vehicle’s photos, core facts, price, seller-provided location, description, and the MVP offer entry point. It must preserve the public feed’s scroll position when a user returns from the detail route. Buyer–seller communication, saving listings, related listings, image zoom, and richer trust/finance features remain outside this phase.

</domain>

<decisions>
## Implementation Decisions

### Page structure and visual direction
- **D-01:** Use the approved photo-led marketplace layout: on desktop, an asymmetric two-column hero pairs the gallery with title, price, location, facts, and action area; on mobile, the media is full-width before the listing summary.
- **D-02:** Format the heading as `Make Model · Year` (for example, `Royal Enfield Hunter 350 · 2022`).
- **D-03:** Stay focused on the single vehicle: do not add a similar-listings section in this MVP page.
- **D-04:** Show a decorative heart icon in the hero, but do not implement saved-listing behavior yet.

### Images and content
- **D-05:** Render a static hero image when a listing has one image. Render a carousel only when it has multiple images; use visible navigation arrows and indicators, but no thumbnails in the MVP.
- **D-06:** Show the supplied city/location exactly as the listing data provides it. Do not invent additional location or privacy fields.
- **D-07:** Clamp long descriptions and reveal the remaining text with a `Read more` control.

### Offer entry and owner state
- **D-08:** Show `Make an offer` to every visitor. For anonymous visitors, route to sign-in and return them to this listing afterwards; the actual buyer–seller offer/message flow is deferred.
- **D-09:** For the listing owner, replace the offer CTA with `Edit listing`.
- **D-10:** On mobile, retain only the primary `Make an offer` button in the sticky bottom action area; do not repeat the price there.

### Navigation continuity
- **D-11:** When a user opens a listing from the public feed and returns with browser Back or the in-app back affordance, restore the prior feed position so the opened card remains visible. Preserve this behavior through the listing-detail route rather than resetting the feed to its top.

### the agent's Discretion
- Determine the exact responsive breakpoints, gallery animation and keyboard behavior, metadata/fact ordering, loading/error boundaries, accessible labels, and the smallest route/state mechanism that satisfies D-11 without adding unnecessary client state.
- The visual heart should be clearly non-actionable until saved listings are implemented, so it does not imply a completed capability.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Product and Phase 6 dependency
- `.planning/PROJECT.md` — marketplace MVP boundary and deferred buyer–seller interaction.
- `.planning/REQUIREMENTS.md` — public browsing and listing-data requirements.
- `.planning/phases/06-listing-image-management/06-CONTEXT.md` — ordered image model, reliable cover/placeholder behavior, and explicit deferral of gallery UI; Phase 7 depends on this contract.
- `.planning/ROADMAP.md` — Phase 7 dependency on Phase 6.

### Existing web patterns
- `src/components/listing-card.tsx` — current listing card and image fallback presentation.
- `src/components/listings-feed.tsx` — public feed, source of detail-page navigation, and return-scroll integration point.
- `src/components/auth-required.tsx` — existing signed-out interaction pattern.
- `src/components/site-header.tsx` — global responsive navigation conventions.
- `src/lib/listings.ts` — price and vehicle-type formatting helpers.
- `src/lib/database.types.ts` — generated listing/image data contract.
- `src/app/globals.css` — established warm-paper, green-ink, orange-accent visual system and responsive conventions.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ListingCard` provides the starting vehicle identity, cover-image fallback, price, and fact display patterns.
- `ListingsFeed` owns the mapping from loaded public listings to cards and is the natural integration point for detail links and return-position behavior.
- `formatPrice` and `formatVehicleType` standardize public listing text.
- `AuthRequired` and the existing auth page provide the sign-in redirect pattern for the public offer CTA.

### Established Patterns
- The client uses Supabase through browser-side helpers and RLS; public reads expose active listings only.
- UI styles use CSS classes and the shared `--paper`, `--ink`, `--accent`, and `--radius` tokens in `globals.css`.
- Listing images must retain a placeholder fallback if an image is absent or fails to load.

### Integration Points
- Add a dynamic listing route that can load a single active listing for public viewers while preserving owner-only edit affordances.
- Convert listing cards into accessible detail navigation while retaining public-feed loading, empty, and error behavior.
- Consume Phase 6 ordered image metadata if present, while the detail visual supports an image-less or single-image listing safely.

</code_context>

<specifics>
## Specific Ideas

- The approved reference is a lean Cars24/Spinny-inspired information hierarchy: vehicle imagery first; price, facts, and one next action second; extensive inspection, EMI, finance, trust, and messaging layers intentionally excluded.
- The page should feel calm and marketplace-native within Revvbase’s existing warm paper, dark green, and orange visual language.

</specifics>

<deferred>
## Deferred Ideas

- Actual offer submission, buyer–seller messaging, phone/WhatsApp contact, and notification flows.
- Functional saved listings/favourites.
- Similar listings, search, filters, location/radius discovery, financing/EMI, inspection reports, warranties, and trust badges.
- Image thumbnails, zoom/lightbox, reordering, manually selected covers, and photo gallery polish beyond the basic carousel.

</deferred>

---

*Phase: 07-build-the-listing-detail-page*
*Context gathered: 2026-08-01*
