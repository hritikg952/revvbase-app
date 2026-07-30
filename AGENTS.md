# AGENTS.md instructions for /Users/peakysmokin14/dev/personal_projects/revvbase-app

## graphify

- **graphify** (`~/.Codex/skills/graphify/SKILL.md`) — any input to knowledge graph. Trigger: `/graphify`.
- When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

--- project-doc ---

## Project

**Revvbase**

Revvbase is a simple web marketplace for second-hand two-wheelers in India. Visitors can browse vehicles publicly, and users can create accounts and list motorcycles, scooters, electric two-wheelers, or bicycles. One account can act as both buyer and seller.

**MVP core value:** A visitor can discover two-wheelers, and an authenticated user can publish a listing with the key details needed to start a sale.

### MVP scope

- Responsive React/Next.js website.
- Public browsing without authentication.
- Email/password sign-up, sign-in, session persistence, and sign-out.
- One user model; no buyer/seller role split.
- Authenticated users can create, read, update, and delete their own listings.
- Minimal listing-management controls are allowed; a polished seller dashboard is deferred.
- Images are optional initially; use a stock placeholder in the UI.
- Store city/location now; defer sophisticated filters, search, and radius queries.
- No moderation/admin workflow in the MVP.

### Constraints

- **Platform:** responsive web application.
- **Frontend:** React/Next.js, exact setup provisional until implementation planning.
- **Backend:** Supabase hosted PostgreSQL, Supabase Auth, generated data access, and Row Level Security.
- **Hosting:** a suitable Next.js host; Railway is not required for the MVP.
- **Security:** public/publishable Supabase key only in the browser; never expose the service-role key.
- **Scalability:** keep the schema PostGIS-ready, but do not build radius search yet.

--- stack-doc ---

## Active Technology Stack

| Layer | Choice | MVP use |
|---|---|---|
| Website | React/Next.js | Public marketplace and authenticated listing form |
| Backend | Supabase | Managed backend instead of custom FastAPI/Railway services |
| Database | Supabase PostgreSQL | Profiles, listings, statuses, indexes, future PostGIS |
| Auth | Supabase Auth email/password | Sign-up, sign-in, session refresh, sign-out |
| Authorization | PostgreSQL Row Level Security | Public active reads and owner-only CRUD |
| Client data access | `@supabase/supabase-js` | Browser access with the public/publishable key |
| Images | Stock placeholder initially; Supabase Storage later | Avoid image-pipeline scope in the first validation |
| Custom server code | Supabase Edge Functions only when needed | Small integrations, webhooks, or protected operations |
| Hosting | Any suitable Next.js host | Railway is not required |

### Data model direction

- Use `auth.users` as the identity source.
- Add `profiles` only for public user information.
- `listings.seller_id` references `auth.users.id`.
- Listing fields start from `backend/app/listings/models.py`, translated into reviewed Supabase SQL.
- Listing status supports at least `active` and `deleted`.
- City/location is stored now; PostGIS radius search is deferred.
- Image rows/storage are optional until real image upload is required.

### Security rules

- Anonymous users can read active listings only.
- Authenticated users can insert listings only for themselves.
- Users can read, update, and delete only their own listings through owner policies.
- RLS is mandatory; UI checks are not sufficient authorization.
- Never commit or expose Supabase service-role credentials.

### Deferred technology

Do not introduce Expo, React Native, FastAPI, Alembic, Railway, MSG91, Cloudinary, SecureStore, or mobile-specific libraries unless a later product decision explicitly reintroduces them.

--- conventions-doc ---

## Conventions

Conventions not yet established. Follow existing patterns in the codebase and update this section as patterns emerge.

--- architecture-doc ---

## Architecture

The active architecture is documented in `.planning/research/ARCHITECTURE-MVP.md`.

```text
Browser
  ├── Supabase Auth (email/password, session refresh)
  ├── Supabase Data API / supabase-js (listing reads and owner CRUD)
  └── Supabase Storage (optional later; stock image first)

Supabase PostgreSQL
  ├── auth.users
  ├── profiles
  └── listings
```

Use Supabase Edge Functions for small custom server operations. Add a separate backend only when a concrete requirement needs long-running Python work, complex workflows, or background jobs.

--- skills-doc ---

## Project Skills

No project skills found. Add skills to any of: `.Codex/skills/`, `.agents/skills/`, `.cursor/skills/`, `.github/skills/`, or `.codex/skills/` with a `SKILL.md` index file.

--- workflow-doc ---

## GSD Workflow Enforcement

Before using Edit, Write, or other file-changing tools, start work through a GSD command so planning artifacts and execution context stay in sync.

Use these entry points:

- `/gsd-quick` for small fixes, doc updates, and ad-hoc tasks
- `/gsd-debug` for investigation and bug fixing
- `/gsd-execute-phase` for planned phase work

Do not make direct repo edits outside a GSD workflow unless the user explicitly asks to bypass it.

--- profile-doc ---

## Developer Profile

> Profile not yet configured. Run `/gsd-profile-user` to generate your developer profile.
> This section is managed by `generate-Codex-profile` — do not edit manually.
