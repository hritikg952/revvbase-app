# Revvbase MVP Stack

**Updated:** 2026-07-29
**Status:** Active planning direction

| Layer | Choice | MVP use |
|---|---|---|
| Website | React/Next.js | Responsive public marketplace and authenticated listing form |
| Backend | Supabase | Managed platform rather than custom FastAPI/Railway services |
| Database | Supabase PostgreSQL | Users, profiles, listings, statuses, indexes |
| Auth | Supabase Auth email/password | Sign-up, sign-in, session persistence, sign-out |
| Authorization | PostgreSQL Row Level Security | Public active reads and owner-only CRUD |
| Data access | `@supabase/supabase-js` | Browser access using publishable key |
| Images | Stock placeholder initially; Supabase Storage later | Avoid image-pipeline scope in first validation |
| Custom server code | Supabase Edge Functions only when needed | Integrations or small protected operations |
| Hosting | Any suitable Next.js host | Railway is not required |

## Principles

- Keep the browser-to-Supabase path simple, but treat RLS as mandatory rather than optional.
- Do not expose service-role keys to the browser.
- Keep the existing vehicle fields as the starting point, but do not carry mobile-only or infrastructure-only decisions forward.
- Prefer database constraints and policies over UI-only validation.
- Add PostGIS, Storage, Edge Functions, or a separate backend only when a requirement justifies them.
