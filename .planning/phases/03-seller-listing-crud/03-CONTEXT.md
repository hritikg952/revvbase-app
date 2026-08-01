# Phase 3: Seller listing CRUD - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted

<domain>
## Phase Boundary

Let an authenticated user create, view, edit, and soft-delete their own listings through minimal, mobile-friendly controls. A polished dashboard and public discovery presentation remain outside this phase.

</domain>

<decisions>
## Implementation Decisions

### Listing form
- Use one reusable form for create and edit, grouped into Vehicle, Condition, Price and location, and Description sections.
- Represent prices as whole Indian rupees, odometer values as kilometres, and insurance validity as an optional date.
- Use catalog suggestions where useful but permit free-text make/model values so the seed cannot block a seller.

### Management flow
- `/sell` creates a listing and `/my-listings` provides minimal owner controls.
- Editing uses `/listings/[id]/edit`; soft deletion requires an explicit confirmation.
- Deleted listings remain visible to their owner with a clear status but cannot be restored in the MVP.

### the agent's Discretion
- Field-level validation details and component boundaries may follow accessible HTML and Supabase client conventions.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 2 supplies Auth context, site shell, shared CSS tokens, and Supabase client.
- Phase 1 supplies constraints and owner-scoped RLS.

### Established Patterns
- Mutations report pending, success, and actionable error states.
- UI guards are convenience only; ownership enforcement lives in RLS.

### Integration Points
- Listing form writes to `public.listings` with `seller_id` from the authenticated session.
- Owner management reads all rows visible through the owner SELECT policy.

</code_context>

<specifics>
## Specific Ideas

Keep the workflow short enough to complete on a phone and use Indian number formatting in summaries.

</specifics>

<deferred>
## Deferred Ideas

Photo upload, restoration, drafts, bulk actions, analytics, and a polished seller dashboard are deferred.

</deferred>
