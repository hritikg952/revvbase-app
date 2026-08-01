# Phase 7: Build the listing detail page - Research

**Researched:** 2026-08-01
**Domain:** Next.js App Router public listing detail, Supabase browser reads, accessible media gallery, and navigation continuity
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

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

### Deferred Ideas (OUT OF SCOPE)
- Actual offer submission, buyer–seller messaging, phone/WhatsApp contact, and notification flows.
- Functional saved listings/favourites.
- Similar listings, search, filters, location/radius discovery, financing/EMI, inspection reports, warranties, and trust badges.
- Image thumbnails, zoom/lightbox, reordering, manually selected covers, and photo gallery polish beyond the basic carousel.
</user_constraints>

## Project Constraints (from AGENTS.md)

- Use the existing responsive React/Next.js web application with Supabase PostgreSQL/Auth/RLS; do not introduce the deferred FastAPI, Railway, Expo, React Native, or mobile-specific stack. [VERIFIED: AGENTS.md]
- Browser code may contain only the Supabase public/publishable key; it must never expose a service-role key. [VERIFIED: AGENTS.md]
- Public reads must be active listings only; ownership authorization remains PostgreSQL RLS, not UI checks. [VERIFIED: AGENTS.md]
- Follow established repository patterns; the project has no additional project-defined skills. [VERIFIED: AGENTS.md]
- This research artifact is the only permitted write for this assignment; Phase 6 work is an in-progress, read-only dependency. [VERIFIED: orchestrator assignment]

## Summary

Implement `/listings/[id]` as a client page consistent with the existing browser-only Supabase boundary: read the active listing by `id`, load its ordered `listing_images` through the existing storage adapter, and derive the owner affordance from `useAuth().user?.id === listing.seller_id`. The current database policies already make active listing and image metadata publicly readable while restricting draft image metadata to the owner, so the route must not bypass RLS or use privileged credentials. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/auth]

Make `ListingCard` a semantic link to that route and create exactly one short-lived session return record `{ listingId, scrollY, nonce, claimed: false }` immediately before navigation. Put the same opaque nonce in an internal provenance query parameter on that generated detail URL. The detail route must validate the exact listing ID plus nonce, atomically claim the record once, and use `router.back()` only for that claimed visit; every direct, missing, malformed, stale, or nonmatching visit must render/use a `/` listings fallback and must never call history Back because storage happens to contain a record. The returned feed restores only the claimed record after its target card renders, then removes it. Next.js scrolls client-side navigations to the top by default, hence this narrowly scoped restoration is required by D-11. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] [ASSUMED]

Use one local `activeIndex` state only when `images.length > 1`; one image is plain media without controls, and no-image falls back to the stock illustration. The multi-image view uses native previous/next buttons plus numbered indicators, keyboard-operable button semantics, visible labels, and no auto-rotation. D-08 is intentionally an auth-gated entry point, not an offer form: anonymous activation opens `/auth?returnTo=/listings/<id>`, and successful sign-in/sign-up returns to a validated internal `returnTo`. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/] [ASSUMED]

**Primary recommendation:** Do not start Phase 7 implementation until Phase 6 Plan 06-06 is complete; then add a small client-side `ListingDetail` composition, image-gallery component, and nonce-bound feed-return helper that consume the finalized Phase 6 public image contract without assuming a concurrent API. [VERIFIED: ROADMAP.md] [VERIFIED: .planning/STATE.md] [ASSUMED]

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|------------|-------------|----------------|-----------|
| Public active-listing detail read | Browser / Client | Database / Storage | Existing public feed already uses `supabase-js` in a client component, and RLS restricts rows to active listings. [VERIFIED: codebase grep] |
| Ordered listing-photo read and public URL derivation | Browser / Client | Database / Storage | The provider-neutral adapter lists `listing_images` ordered by `position` and derives public URLs. [VERIFIED: src/lib/storage/supabase-listing-images.ts] |
| Owner-only Edit affordance | Browser / Client | Database / Storage | The browser compares the authenticated user ID for presentation while existing owner RLS remains the authorization boundary. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Anonymous offer entry and post-auth return | Browser / Client | Frontend Server (SSR) — | This phase routes within the App Router; it does not submit an offer or need a server operation. [VERIFIED: 07-CONTEXT.md] |
| Feed return positioning | Browser / Client | — | A nonce-bound, one-time session record proves a feed-originated visit before history Back or restoration is allowed. [ASSUMED] |
| Mobile sticky CTA | Browser / Client | — | Responsive layout and sticky positioning are presentation concerns. [VERIFIED: 07-CONTEXT.md] |

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `next` | 16.2.12 | App Router route, `<Link>`, `useParams`, and `useRouter` | Already installed; App Router exposes dynamic params in client components and recommends `<Link>` for ordinary navigation. [VERIFIED: package.json] [CITED: https://nextjs.org/docs/app/api-reference/functions/use-params] [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] |
| `react` / `react-dom` | 19.2.8 | Local gallery, description clamp toggle, loading/error states | Already installed and the project’s components use client React state. [VERIFIED: package.json] [VERIFIED: codebase grep] |
| `@supabase/supabase-js` | 2.111.0 | Existing public listing/image data access and Auth session | Already installed; Supabase SDK data calls carry the user Auth token for RLS-scoped access. [VERIFIED: package.json] [CITED: https://supabase.com/docs/guides/auth] |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `vitest` | 4.1.10 | Unit tests for extracted gallery, return-path, and description helpers | Reuse the configured Node Vitest setup for deterministic logic; browser-level scroll behavior remains a manual acceptance check unless a browser runner is deliberately added later. [VERIFIED: package.json] [VERIFIED: vitest.config.ts] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Local gallery state | A carousel dependency | The locked scope needs only five maximum images, arrows, and indicators; a dependency adds API/styling/a11y integration cost without a requirement it solves. [VERIFIED: 06-CONTEXT.md] [ASSUMED] |
| Feed-scoped `sessionStorage` return record | Global state store | A global store would outlive the one navigation flow and adds state management with no other consumer. [ASSUMED] |
| Client public read | Server-side data layer | The existing feed, edit route, Auth provider, and Supabase browser client establish client data access; changing this route alone would create a second access pattern. [VERIFIED: codebase grep] |

**Installation:** No packages are required. [VERIFIED: package.json]

## Architecture Patterns

### System Architecture Diagram

```text
Public feed (/)
  └─ ListingCard Link click
       ├─ save one short-lived { listingId, scrollY, nonce, claimed:false } record
       └─ /listings/[id]?fromFeed=<matching nonce>
            ├─ public Supabase listing query: id + status=active
            │    └─ RLS returns only public active record
            ├─ ordered image adapter list(id)
            │    └─ listing_images ordered by position → public URLs
            ├─ validate exact ID + nonce; claim record once
            └─ ListingDetail UI
                 ├─ 0 image → stock placeholder
                 ├─ 1 image → static hero media
                 ├─ 2–5 images → manual accessible carousel
                 ├─ anonymous Make an offer → /auth?returnTo=/listings/[id]
                 └─ owner Edit listing → /listings/[id]/edit

Auth success
  └─ validated internal returnTo → /listings/[id]

Claimed detail in-app Back or browser Back
  └─ history return → feed renders target card → consumes claimed record once → opened card visible

Direct/missing/malformed/stale/nonmatching detail visit
  └─ `/` listings fallback; never invoke history Back from session storage alone
```

The flow preserves the established public client/RLS boundary and the Phase 6 position-zero cover ordering. [VERIFIED: codebase grep]

### Recommended Project Structure

```text
src/
├── app/listings/[id]/
│   ├── page.tsx                 # dynamic public route and detail composition
│   └── loading.tsx              # immediate route loading feedback
├── components/
│   ├── listing-detail.tsx       # public data UI, owner/anonymous CTA selection
│   ├── listing-media-gallery.tsx # 0/1/many-media rendering and manual controls
│   └── listings-feed.tsx        # return-record capture and post-load restoration
└── lib/
    ├── listing-return.ts        # pure, testable returnTo and scroll-record helpers
    └── storage/                 # existing provider-neutral image adapter; do not bypass
```

`loading.tsx` is recommended for dynamic App Router navigation because it supplies an immediate fallback while the dynamic route resolves. [CITED: https://nextjs.org/docs/app/getting-started/linking-and-navigating]

### Pattern 1: Public detail query with separate ordered image read

**What:** Query the listing as `id` plus `status = active`, then use the existing `ListingImageStorage.list(id)` adapter; do not join against storage internals or read draft data. [VERIFIED: src/components/listings-feed.tsx] [VERIFIED: src/lib/storage/supabase-listing-images.ts]

**When to use:** Every public detail visit, including a signed-in owner viewing an active listing. [VERIFIED: 07-CONTEXT.md]

**Example:**

```tsx
// Source: existing public-feed and Phase 6 storage patterns
const listingResult = await getSupabaseBrowserClient()
  .from("listings")
  .select("*")
  .eq("id", id)
  .eq("status", "active")
  .single();

const images = listingResult.data
  ? await listingImageStorage.list(listingResult.data.id)
  : [];
```

The route must show a neutral unavailable state for a missing, deleted, draft, or RLS-hidden record instead of disclosing which condition occurred. [ASSUMED]

### Pattern 2: Feed return record and history-preserving back

**What:** Before a card navigation, create one short-lived `{ listingId, scrollY, nonce, claimed: false }` record under one namespaced `sessionStorage` key, then navigate to `/listings/<id>?fromFeed=<nonce>`. The detail route parses the provenance parameter and must validate exact ID, nonce, expiration, and unclaimed state before changing the record to `claimed: true`. Only that successful one-time claim enables its in-app Back button to call `router.back()`. The feed restores only a matching claimed record after its target card is rendered, then removes it. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] [ASSUMED]

**When to use:** Only the exact visit generated by `ListingsFeed` may claim the record. Direct URL entry, refresh after a record was consumed, a missing/invalid/stale/nonmatching nonce, or an already-claimed record must use the listings fallback and must never invoke `router.back()` because session storage exists. [ASSUMED]

**Example:**

```tsx
// Source: Next.js useRouter API + Phase 7 D-11
const RETURN_KEY = "revvbase:listings-return";

function saveFeedReturn(listingId: string) {
  const nonce = crypto.randomUUID();
  sessionStorage.setItem(RETURN_KEY, JSON.stringify({ listingId, scrollY: window.scrollY, nonce, claimed: false }));
  return nonce;
}

function useClaimedBack(router: ReturnType<typeof useRouter>, claimed: boolean) {
  if (claimed) router.back();
  else router.push("/");
}
```

### Pattern 3: Static single media, manual multi-media carousel

**What:** Branch by image count before rendering controls: fallback/one image has no carousel semantics or controls; two-or-more uses a local `activeIndex`, native arrow buttons, and indicator buttons. Do not auto-advance. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/]

**When to use:** Ordered images returned by the existing storage adapter; use the first image as initial media. [VERIFIED: 06-CONTEXT.md]

**Example:**

```tsx
// Source: W3C APG Carousel Pattern
<section aria-roledescription="carousel" aria-label="Vehicle photos">
  <img src={images[activeIndex].publicUrl} alt={`${title}, photo ${activeIndex + 1} of ${images.length}`} />
  <button type="button" aria-label="Previous photo" onClick={showPrevious}>←</button>
  <button type="button" aria-label="Next photo" onClick={showNext}>→</button>
  <div aria-label="Choose photo">
    {images.map((_, index) => <button key={index} type="button" aria-label={`Show photo ${index + 1}`} onClick={() => setActiveIndex(index)} />)}
  </div>
</section>
```

### Anti-Patterns to Avoid

- **Call `router.back()` because a return record merely exists:** Storage is not provenance; only a one-time exact listing-ID/nonce claim may authorize history Back. Use the listings fallback for all other visits. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] [ASSUMED]
- **Always render carousel chrome:** One image needs ordinary image semantics; inactive arrows and dots add noise and contradict D-05. [VERIFIED: 07-CONTEXT.md]
- **Treat owner UI as authorization:** Hiding `Edit listing` is presentation only; server-side RLS and owner-scoped edit queries must remain unchanged. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]
- **Read `listing_images` directly in the component:** That leaks provider URL derivation out of the Phase 6 storage boundary. [VERIFIED: 06-CONTEXT.md]
- **Make the decorative heart a button:** A focusable inert control advertises unavailable saved-listing behavior; render a labelled decorative icon, not an action. [VERIFIED: 07-CONTEXT.md] [ASSUMED]

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Route matching and history transition | Custom pathname parser or `window.history` route layer | Next.js `[id]`, `<Link>`, `useParams`, and `router.back()` | App Router provides dynamic segment access and browser-history navigation semantics. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-params] [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router] |
| Data authorization | Client-side owner condition | Existing Supabase RLS policies | Auth-token-scoped SDK requests plus RLS protect rows even if UI is changed or bypassed. [CITED: https://supabase.com/docs/guides/auth] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| Image ordering/public URL resolution | Ad hoc `listing_images` query and string-built CDN URL | Existing `ListingImageStorage.list()` adapter | The adapter owns ordered metadata mapping and provider-specific public URL derivation. [VERIFIED: src/lib/storage/supabase-listing-images.ts] |
| Carousel keyboard controls | Clickable `div`s and timer logic | Native buttons and the W3C manual carousel pattern | Native buttons already implement button keyboard behavior; a manual carousel avoids rotation-control complexity. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/] |

**Key insight:** Reuse boundaries already created by Phases 2, 4, and 6; this page is a composition and continuity phase, not a new data/auth/storage architecture. [VERIFIED: codebase grep]

## Common Pitfalls

### Pitfall 1: Restoring scroll before feed cards exist

**What goes wrong:** Calling `window.scrollTo` when the feed is still showing skeletons lands the user at the wrong place after cards change page height. [ASSUMED]

**Why it happens:** The current feed loads asynchronously in an effect and replaces skeletons after the Supabase result arrives. [VERIFIED: src/components/listings-feed.tsx]

**How to avoid:** Restore only after `loading === false` and the target card element is present; use the target element as the primary anchor and the saved offset only as a fallback. [ASSUMED]

**Warning signs:** Browser Back returns to the feed top or to blank space on slow networks. [ASSUMED]

### Pitfall 2: Open redirect through `returnTo`

**What goes wrong:** Trusting an arbitrary auth query value can send a newly authenticated user to an external or malformed URL. [ASSUMED]

**Why it happens:** Query-string input is user-controlled. [ASSUMED]

**How to avoid:** Accept only a non-empty internal pathname matching the expected listing route, otherwise fall back to `/`; use the same resolver for sign-in and immediate sign-up completion. [ASSUMED]

**Warning signs:** Authentication redirects to an unexpected origin or the auth flow lands on `/` despite a valid listing return. [ASSUMED]

### Pitfall 3: Showing carousel controls for zero or one image

**What goes wrong:** Users see disabled or meaningless controls and assistive technology encounters an unnecessary widget. [VERIFIED: 07-CONTEXT.md]

**Why it happens:** A gallery component treats all image arrays identically. [ASSUMED]

**How to avoid:** Make image count an explicit rendering boundary: 0 placeholder, 1 static image, 2+ manual carousel. [VERIFIED: 07-CONTEXT.md]

**Warning signs:** Arrow controls are rendered beside the placeholder or a single photo. [VERIFIED: 07-CONTEXT.md]

### Pitfall 4: Owner-only affordance races Auth loading

**What goes wrong:** Rendering `Make an offer` before `useAuth` resolves causes a logged-in owner to see the wrong CTA briefly. [ASSUMED]

**Why it happens:** `AuthProvider` obtains the initial session asynchronously. [VERIFIED: src/components/auth-provider.tsx]

**How to avoid:** Treat auth loading as CTA-pending state; render the owner/visitor CTA only after `loading` is false. [ASSUMED]

**Warning signs:** CTA text changes after the detail page appears for an owner. [ASSUMED]

## Code Examples

Verified patterns from official sources:

### Dynamic route param in a client component

```tsx
// Source: https://nextjs.org/docs/app/api-reference/functions/use-params
"use client";
import { useParams } from "next/navigation";

const { id } = useParams<{ id: string }>();
```

### Auth identity as a UI affordance, RLS as enforcement

```tsx
// Source: https://supabase.com/docs/reference/javascript/auth-getuser
const isOwner = Boolean(user && listing && user.id === listing.seller_id);
const cta = isOwner ? `/listings/${listing.id}/edit` : `/auth?returnTo=/listings/${listing.id}`;
```

The code selects presentation; protected database policies continue to enforce who can mutate any listing. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy `listings.image_url` | Ordered `listing_images` metadata with provider-derived stable public URLs | Phase 6 in-progress migration | Detail media must consume the adapter and position ordering, while retaining placeholder behavior. [VERIFIED: 06-CONTEXT.md] [VERIFIED: src/lib/storage/supabase-listing-images.ts] |
| Broad public listing cards only | Existing App Router supports a focused `[id]` dynamic segment | Current installed Next.js App Router | A detail page can be added without creating a separate router. [VERIFIED: package.json] [CITED: https://nextjs.org/docs/app/api-reference/functions/use-params] |

**Deprecated/outdated:**

- Directly treating `listing.image_url` as the universal public-image source: Phase 6 establishes `listing_images` as the one-to-many image model and reserves position zero as cover. [VERIFIED: 06-CONTEXT.md]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|-------|---------|---------------|
| A1 | A nonce-bound, short-lived, one-time-claim session record plus history Back is the smallest fail-closed D-11 mechanism under the current client-feed architecture. | Summary; Pattern 2 | Browser UAT may reveal a lifecycle edge case requiring a different browser-state mechanism. |
| A2 | `returnTo` must be limited to an internal listing pathname and resolved in both auth completion branches. | Summary; Pitfall 2 | An implementation could introduce an open redirect or lose the post-auth return. |
| A3 | The missing/deleted/draft/RLS-hidden detail state should share neutral copy. | Pattern 1 | Product may prefer a more specific public not-found policy. |
| A4 | No carousel library is warranted for the fixed five-image scope. | Standard Stack | A future richer gallery could require a dedicated audited component. |

## Open Questions (RESOLVED)

1. **Which Phase 6 image API does the detail page consume?**
   - Resolution: Phase 7 implementation must start only after Phase 6 Plan 06-06 completes. The planner/implementer must re-read the final Phase 6 public image contract and consume it as finalized; Phase 7 may not assume, code against, or request a concurrent contract surface. [VERIFIED: ROADMAP.md] [VERIFIED: .planning/STATE.md] [ASSUMED]

2. **When is history Back safe for the in-app affordance?**
   - Resolution: Only a feed card click creates one short-lived `{ listingId, scrollY, nonce, claimed:false }` session record and navigates using the matching internal provenance token. Detail validates exact listing ID plus nonce and claims it once before enabling history Back. A direct, missing, malformed, stale, nonmatching, or already-claimed visit must use the listings fallback and never call history Back based on storage alone. The feed consumes the claimed record once after its target card renders. [ASSUMED]

## Environment Availability

| Dependency | Required By | Available | Version | Fallback |
|------------|-------------|-----------|---------|----------|
| Node.js | Next.js build/typecheck/tests | ✓ | v24.16.0 | — [VERIFIED: local command] |
| npm | Existing scripts and dependency lockfile | ✓ | 11.13.0 | — [VERIFIED: local command] |
| Vitest | Focused unit tests | ✓ | 4.1.10 | — [VERIFIED: package.json] |
| Supabase CLI | Optional hosted RLS/manual acceptance checks | ✗ | — | Existing browser client plus hosted test/runbook workflow; no schema change is planned here. [VERIFIED: local command] [ASSUMED] |

**Missing dependencies with no fallback:** None for planned application implementation. [VERIFIED: local command] [ASSUMED]

**Missing dependencies with fallback:** Supabase CLI is absent from this environment, but Phase 7 is not expected to add migrations or policies. [VERIFIED: local command] [ASSUMED]

## Validation Architecture

### Test Framework

| Property | Value |
|----------|-------|
| Framework | Vitest 4.1.10, Node environment. [VERIFIED: package.json] [VERIFIED: vitest.config.ts] |
| Config file | `vitest.config.ts`. [VERIFIED: vitest.config.ts] |
| Quick run command | `npm test`. [VERIFIED: package.json] |
| Full suite command | `npm run typecheck && npm test && npm run build`. [VERIFIED: package.json] |

The current test suite passes three files and 22 tests. [VERIFIED: local command]

### Phase Requirements → Test Map

Phase 7 has no assigned requirement IDs in `REQUIREMENTS.md`; validate the approved D-01–D-11 decisions directly until roadmap requirements are added. [VERIFIED: ROADMAP.md] [VERIFIED: REQUIREMENTS.md]

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| D-05 | 0/1 image is static fallback/media; 2+ image gallery wraps arrows and selects indicators | unit + manual keyboard | `npm test -- listing-media-gallery` | ❌ Wave 0 |
| D-07 | Long description toggles between clamped and expanded copy | unit | `npm test -- listing-detail` | ❌ Wave 0 |
| D-08 | Only safe internal listing `returnTo` is honored, in sign-in and immediate sign-up paths | unit | `npm test -- auth-return` | ❌ Wave 0 |
| D-09 | Auth owner state resolves to Edit; non-owner resolves to offer/auth entry | unit | `npm test -- listing-detail` | ❌ Wave 0 |
| D-11 | A feed click creates one nonce-bound record and matching internal provenance URL; only exact ID+nonce can claim it once; claimed return restores after target-card render; all direct/missing/malformed/stale/nonmatching/already-claimed visits use `/` and never call history Back | unit + manual browser | `npm test -- listing-return` | ❌ Wave 0 |
| D-01/D-10 | Desktop composition and mobile sticky primary-only CTA | manual responsive smoke | `npm run build` | ❌ manual gate |

### Sampling Rate

- **Per task commit:** `npm test` for utility/component changes, then `npm run typecheck` for route/type changes. [VERIFIED: package.json]
- **Per wave merge:** `npm run typecheck && npm test`. [VERIFIED: package.json]
- **Phase gate:** `npm run typecheck && npm test && npm run build`, plus desktop/mobile manual route, Back, keyboard, and signed-in/signed-out acceptance. [VERIFIED: package.json] [ASSUMED]

### Wave 0 Gaps

- [ ] `src/lib/listing-return.test.ts` — covers D-08 and D-11 internal return-path validation; nonce creation; exact ID/nonce/expiry validation; one-time claim; record consumption; and listings fallback for every invalid provenance case. [ASSUMED]
- [ ] `src/components/listing-media-gallery.test.tsx` or extracted pure gallery helper test — covers D-05 wrap/index behavior. [ASSUMED]
- [ ] `src/components/listing-detail.test.tsx` or extracted pure detail-view-model test — covers D-07 and D-09. [ASSUMED]
- [ ] Manual browser acceptance script/checklist — covers actual claimed Back scroll restoration, direct/fallback Back behavior, sticky mobile CTA, and keyboard focus behavior that the current Node-only Vitest configuration cannot observe. [VERIFIED: vitest.config.ts] [ASSUMED]

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard Control |
|---------------|---------|-----------------|
| V2 Authentication | Yes | Resolve current browser session through the existing Auth provider; do not add a second credential flow. [VERIFIED: src/components/auth-provider.tsx] |
| V3 Session Management | Yes | Preserve the established Supabase persisted session; send anonymous visitors through the existing auth page. [VERIFIED: codebase grep] [CITED: https://supabase.com/docs/guides/auth] |
| V4 Access Control | Yes | Existing active-public and owner-only RLS policies; UI owner check is only an affordance. [VERIFIED: supabase/migrations/20260801000000_add_listing_images_storage.sql] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] |
| V5 Input Validation | Yes | Treat route ID, `returnTo`, image load failures, and session-storage JSON as untrusted; validate/guard and use neutral unavailable states. [ASSUMED] |
| V6 Cryptography | No new cryptographic operation | Use Supabase Auth/session handling; do not implement token, signing, or encryption logic in page code. [VERIFIED: AGENTS.md] [CITED: https://supabase.com/docs/guides/auth] |

### Known Threat Patterns for Next.js/Supabase detail pages

| Pattern | STRIDE | Standard Mitigation |
|---------|--------|---------------------|
| Guessing a draft/deleted listing ID | Information disclosure | Query active public records only; keep RLS active and return one neutral unavailable state. [VERIFIED: codebase grep] [VERIFIED: supabase/migrations/20260801000000_add_listing_images_storage.sql] |
| Forging an owner ID in browser state | Elevation of privilege | Never mutate based on the UI check; retain owner RLS and owner-scoped edit query. [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security] [VERIFIED: src/app/listings/[id]/edit/page.tsx] |
| External `returnTo` value | Tampering / phishing | Whitelist expected internal listing path and use `/` as fallback. [ASSUMED] |
| Broken public image URL | Availability / integrity | Reuse `onError` fallback to `/vehicle-placeholder.svg`; do not expose storage keys in UI. [VERIFIED: src/components/listing-card.tsx] [VERIFIED: src/lib/storage/supabase-listing-images.ts] |

## Sources

### Primary (HIGH confidence)

- [Next.js `useParams` documentation](https://nextjs.org/docs/app/api-reference/functions/use-params) — Client Component dynamic route params; updated February 27, 2026. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-params]
- [Next.js `useRouter` documentation](https://nextjs.org/docs/app/api-reference/functions/use-router) — App Router navigation, history Back, and default scrolling; updated March 25, 2026. [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router]
- [Next.js Linking and Navigating documentation](https://nextjs.org/docs/app/getting-started/linking-and-navigating) — dynamic route loading UI and client transitions; updated March 25, 2026. [CITED: https://nextjs.org/docs/app/getting-started/linking-and-navigating]
- [W3C WAI-ARIA Carousel Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/carousel/) — manual carousel control and keyboard/label requirements. [CITED: https://www.w3.org/WAI/ARIA/apg/patterns/carousel/]
- [Supabase Auth guide](https://supabase.com/docs/guides/auth) and [RLS guide](https://supabase.com/docs/guides/database/postgres/row-level-security) — SDK Auth token/RLS relationship. [CITED: https://supabase.com/docs/guides/auth] [CITED: https://supabase.com/docs/guides/database/postgres/row-level-security]

### Secondary (MEDIUM confidence)

- Local repository implementation, Phase 6 context, migrations, and test results — existing integration contract and environment status. [VERIFIED: codebase grep] [VERIFIED: local command]

### Tertiary (LOW confidence)

- No external tertiary source is used; implementation-specific browser storage and redirect validation recommendations are marked `[ASSUMED]` for planner confirmation. [ASSUMED]

## Metadata

**Confidence breakdown:**

- Standard stack: HIGH — all packages are present in the lockfile/project manifest and framework APIs were checked against official documentation. [VERIFIED: package.json] [CITED: https://nextjs.org/docs/app/api-reference/functions/use-router]
- Architecture: MEDIUM — existing code establishes the integration boundaries; exact Phase 6 consumer surface is in progress and must be re-read before implementation. [VERIFIED: .planning/STATE.md] [VERIFIED: codebase grep]
- Pitfalls: MEDIUM — asynchronous feed/auth behavior is verified in code, while scroll/redirect mitigation mechanics are explicitly logged as assumptions. [VERIFIED: codebase grep] [ASSUMED]

**Research date:** 2026-08-01
**Valid until:** 2026-08-31 for stable route/accessibility patterns; re-read final Phase 6 public consumer artifacts immediately before planning. [ASSUMED]

## RESEARCH COMPLETE
