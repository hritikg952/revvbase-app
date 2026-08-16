# Phase 8: Marketplace Discovery - Context

**Gathered:** 2026-08-16
**Status:** Ready for execution

## Goal

Visitors can discover public listings with structured filters today, while a future search bar can contribute text to the same query architecture.

## Locked decisions

- Desktop uses a sticky sidebar whose filter body scrolls independently; Clear and Apply remain pinned in the footer.
- Mobile uses a bottom-sheet filter panel with a pinned Apply footer.
- The popular row is sticky. The master filter button remains visible while popular pills scroll horizontally.
- Popular pills start as configured values: Electric, Petrol, Scooter, Motorcycle. The configuration shape must support future dynamic counts/visibility.
- Popular pills apply immediately. Detailed filter edits are staged until Apply.
- Multiple values in one filter category use OR logic; different categories use AND logic.
- Search will eventually match make, model, and city, and will combine with structured filters using AND logic.
- Filter state uses stable canonical URL query parameters.
- Filtering and sorting happen in Supabase, with paginated results.
- Initial structured filters: vehicle type, fuel type, make, model, city, price, year, kilometres, and previous owners.
- Insurance, radius, transmission, colour, condition, and seller-type filters are deferred because they are not buyer-critical or not represented consistently in the current schema.
- Sorting supports newest, price ascending, and price descending.
- No per-option result counts are required in this phase.

## Architecture contract

All discovery inputs flow through `ListingDiscoveryQuery` and one Supabase query function. Components do not build individual Supabase predicates. The query model has an optional future `text` field matching make/model/city.

## Existing integration points

- `src/components/listings-feed.tsx` currently fetches all public listings directly and loads listing images.
- `src/lib/database.types.ts` contains the listing field types used by the filters.
- `src/lib/data/vehicles.ts` contains the typed make/model catalog.
- `src/app/globals.css` contains the existing responsive design tokens and breakpoints.

## Out of scope

- Database schema migrations.
- PostGIS/radius search.
- Search suggestions, ranking, full-text indexes, or a visible search input.
- Dynamic filter counts.
