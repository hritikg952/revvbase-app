# Phase 2: Web and authentication shell - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning
**Mode:** Autonomous recommendations accepted

<domain>
## Phase Boundary

Create the responsive Next.js shell and browser-side Supabase email/password authentication experience. Listing creation and feed data belong to later phases.

</domain>

<decisions>
## Implementation Decisions

### Application architecture
- Use Next.js App Router with TypeScript and a `src/` directory.
- Use a single browser Supabase client and an Auth provider; Supabase persists and refreshes the session.
- Keep authentication client-side for the MVP. RLS remains the security boundary; route guards improve UX only.

### Authentication experience
- Use one `/auth` screen with clear Sign in and Create account modes.
- After successful authentication, return users to the public marketplace and expose Sell/My listings actions.
- Display actionable inline errors and disable submissions while requests are running.

### the agent's Discretion
- Exact component boundaries, responsive breakpoints, and accessible form implementation may follow standard Next.js patterns.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phase 1 provides the hosted Supabase URL, publishable key, Auth service, and RLS-secured tables.

### Established Patterns
- Browser configuration may contain only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- The historical FastAPI tree is not an integration target.

### Integration Points
- `@supabase/supabase-js` handles Auth and later Data API calls.
- The shared site header will link the public feed, authentication, listing creation, and owner management routes.

</code_context>

<specifics>
## Specific Ideas

The shell should feel like a focused Indian vehicle marketplace: warm, trustworthy, legible, and useful on mobile without imitating a generic admin dashboard.

</specifics>

<deferred>
## Deferred Ideas

OAuth, phone OTP, role selection, server-rendered protected routes, and account profile editing are deferred.

</deferred>
