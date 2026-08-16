# Phase 8: Marketplace Discovery - Research

**Researched:** 2026-08-16
**Confidence:** High for current MVP scope

## Findings

- The current public feed is a client component that directly queries Supabase and then resolves listing images. The safest change is to move listing selection and predicate construction into a shared `src/lib/listing-discovery.ts` module while keeping image projection in the feed.
- Existing listing fields already cover the initial filter set: vehicle type, make, model, year, odometer, price, city, fuel type, and previous owners.
- Supabase supports composable `.in`, `.gte`, `.lte`, `.order`, `.range`, and `.or` predicates through the existing browser client. Text search should be represented in the shared query model now but not exposed in the UI until a later phase.
- URL state should be parsed and serialized by pure functions so it can be tested independently of React and reused by a future search input.
- The current CSS uses an 820px responsive breakpoint. Desktop filters can use `position: sticky` with an internal `overflow: auto` body; mobile can use a fixed bottom-sheet overlay.

## Recommendation

Implement one normalized `ListingDiscoveryQuery`, one pure URL codec, and one `fetchPublicListings(query)` function. Keep pagination state in the fetch contract, but do not expose a result-count system. Use configured popular-pill definitions that map to the same query fields as detailed filters.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Free-text cities have inconsistent casing | Normalize user-entered city values and use exact options derived from active data; retain a future text search path for broader matching. |
| PostgREST `.or` text syntax is easy to corrupt | Escape the supported search characters in one helper and keep text construction inside the discovery module. |
| Sticky controls fail on short/mobile viewports | Use an internal panel body with explicit min/max heights and test at desktop/mobile breakpoints. |
| Image loading multiplies requests | Preserve current image adapter for this phase; pagination limits the number of cards fetched per request. |
