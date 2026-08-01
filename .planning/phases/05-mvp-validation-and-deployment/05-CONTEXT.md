# Phase 5: MVP validation - Context

**Gathered:** 2026-07-30
**Status:** Ready for non-hosted validation

<domain>
## Phase Boundary

Prove the complete public-browse and seller-listing loop locally against the hosted Supabase backend. Do not deploy the web application or change production-origin configuration until the user resumes hosting.

</domain>

<decisions>
## Implementation Decisions

### Runtime scope
- Run the application locally against the linked hosted Supabase project.
- Keep the four synthetic hosted demo listings as representative inventory.
- Treat web hosting and production Auth origins as explicitly deferred work.

### Validation
- Use the committed hosted acceptance script for Auth/RLS/CRUD and local browser checks for the UI.
- Require clean typecheck, unit tests, build, npm audit, Supabase advisors, and migration parity before completion.

### the agent's Discretion
- Exact local browser test data may be synthetic and temporary.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Phases 1–4 provide hosted database/Auth, production build, acceptance scripts, demo seed, and browser-verified UI.

### Established Patterns
- Privileged Supabase credentials are used only transiently by verification/seed scripts.
- User-facing application code talks directly to Supabase with the publishable key and RLS.

### Integration Points
- `.env.local` configures the browser build with publishable Supabase values only.
- The current localhost Auth origin remains valid for this phase.

</code_context>

<specifics>
## Specific Ideas

The final handoff must include local run instructions and direct evidence for every non-hosted roadmap success criterion.

</specifics>

<deferred>
## Deferred Ideas

Web hosting, production Auth origins, custom domain, analytics, transactional email customization, CI/CD hardening, and preview-environment automation are deferred.

</deferred>
