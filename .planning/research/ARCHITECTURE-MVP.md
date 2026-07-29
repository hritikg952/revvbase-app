# Revvbase MVP Architecture

**Updated:** 2026-07-29
**Status:** Active planning direction

## Overview

The MVP is a public React/Next.js website backed directly by Supabase. Supabase provides hosted PostgreSQL, Auth, generated data APIs, and Row Level Security. A custom FastAPI service and Railway deployment are not part of the initial architecture.

```text
Browser
  ├── Supabase Auth (email/password, session refresh)
  ├── Supabase Data API / supabase-js (listing reads and owner CRUD)
  └── Supabase Storage (optional later; stock image first)

Supabase PostgreSQL
  ├── auth.users (managed identities)
  ├── profiles (optional public user details)
  └── listings (vehicle data and ownership)
```

## Data model direction

- `auth.users` remains the identity source.
- `profiles.id` references `auth.users.id` if public profile data is needed.
- `listings.seller_id` references `auth.users.id`.
- `listings.status` supports at least `active` and `deleted`.
- Listing fields should follow the existing `backend/app/listings/models.py`, translated into SQL types and reviewed for MVP necessity.
- Store city/location now as ordinary fields. Enable PostGIS and add spatial indexes only when radius search becomes a real requirement.
- Store image metadata only if image upload is enabled; otherwise use a stock placeholder in the web UI.

## Security model

RLS is the authorization boundary:

- Public `SELECT` is limited to active listings.
- Authenticated users can `INSERT` only when `seller_id = auth.uid()`.
- Users can `SELECT`, `UPDATE`, and soft-delete their own listings.
- Public clients use only the Supabase publishable/anon key.
- Service-role credentials never ship to the browser.

## Main flows

### Public browse

1. Visitor opens the site without a session.
2. Next.js/browser Supabase client selects active listings.
3. RLS permits the read.
4. The page renders listing cards with a stock-image fallback.

### Authentication

1. User signs up or signs in with email/password.
2. Supabase Auth manages the JWT session and refresh cycle.
3. The browser observes auth state and exposes authenticated listing actions.

### Listing CRUD

1. Authenticated user submits the listing form.
2. Client sends the row with `seller_id` from the current authenticated user.
3. RLS validates ownership at the database boundary.
4. Public queries see the row only when its status is `active`.

## When to add server-side code

Use a Supabase Edge Function for small custom operations such as webhooks, moderation hooks, or third-party integrations. Add a separate backend service only if the product needs long-running Python work, complex workflows, background jobs, or capabilities that do not fit Supabase functions.

## Deferred architecture

Seller dashboards, image upload workflows, search/filter APIs, PostGIS radius functions, messaging, moderation, and trust systems are intentionally outside the MVP architecture.
