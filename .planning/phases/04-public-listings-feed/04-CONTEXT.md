# Phase 4: Public listings feed - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted

<domain>
## Phase Boundary

Turn the public home page into an understandable active-listing marketplace with responsive cards and explicit loading, empty, and error states. Search, filters, and full detail pages are deferred.

</domain>

<decisions>
## Implementation Decisions

### Feed presentation
- Lead with a compact value proposition and current inventory grid; do not hide listings behind authentication.
- Cards show vehicle type, make/model, year, kilometres, city, and Indian-rupee price.
- Use a local stock placeholder when `image_url` is absent or fails to load.

### Data behavior
- Query the Supabase `listings` table ordered newest first; RLS and an explicit active filter both guard the feed.
- Fetch on the client so loading and retry behavior are directly visible.
- Provide a retry action for errors and a Sell your vehicle CTA in the empty state.

### the agent's Discretion
- Exact grid breakpoints, semantic card markup, and price formatting implementation may follow web accessibility conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 2 provides the home route shell and design tokens.
- Phase 3 provides shared listing types, formatting, and placeholder asset.

### Established Patterns
- Supabase errors are converted into plain, actionable UI messages.
- Public data access never depends on a logged-in session.

### Integration Points
- Home page selects public columns from `public.listings` through the publishable client.
- Navigation connects public cards to seller actions without introducing a detail-view requirement.

</code_context>

<specifics>
## Specific Ideas

The inventory should feel credible even with a small seed: generous imagery, strong price hierarchy, and compact vehicle facts.

</specifics>

<deferred>
## Deferred Ideas

Search, filters, pagination, radius queries, favorites, contact actions, and listing detail pages are deferred.

</deferred>
