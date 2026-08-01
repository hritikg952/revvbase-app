# Phase 1: Supabase foundation - Context

**Gathered:** 2026-07-30
**Status:** Ready for planning

<domain>
## Phase Boundary

Establish the hosted Supabase database contract for the Revvbase MVP: reproducible schema migrations, reference vehicle data, ownership constraints, and Row Level Security. Application features and UI work begin in later phases.

</domain>

<decisions>
## Implementation Decisions

### the agent's Discretion
- All implementation choices are at the agent's discretion because this is a pure infrastructure phase.
- Use the linked hosted project for validation; local Docker is not a prerequisite.
- Treat `auth.users` as the identity source and use soft deletion for listings.
- Keep image storage and PostGIS out of this phase; retain nullable image metadata and ordinary city fields so those capabilities can be added later.

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `backend/app/listings/models.py` documents the historical vehicle fields that must be translated deliberately into SQL.
- `.planning/research/ARCHITECTURE-MVP.md` defines the direct browser-to-Supabase trust boundary.

### Established Patterns
- The historical FastAPI/Alembic implementation is superseded and must not become the active data path.
- Database constraints and RLS policies are preferred over UI-only authorization.

### Integration Points
- Later phases will consume the public Data API with `@supabase/supabase-js`.
- The linked hosted Supabase project is `qokumaemcqwkqhrxyolc` in `ap-south-1`.

</code_context>

<specifics>
## Specific Ideas

Use standard Supabase migration and seed conventions, validate directly against the hosted project, and never commit privileged credentials.

</specifics>

<deferred>
## Deferred Ideas

PostGIS radius search, image storage/upload, moderation, and a custom backend remain deferred.

</deferred>
