# Roadmap: Revvbase Web MVP

## Overview

The revised roadmap validates the smallest useful marketplace loop first: public browsing, email/password authentication, seller listing CRUD, and secure database access. Supabase supplies the hosted PostgreSQL database, Auth, generated data APIs, and Row Level Security. A custom FastAPI service and Railway deployment are intentionally deferred.

## Milestones

### [ ] Milestone 1: Supabase foundation

**Goal:** Establish the database and security contracts without building application features.

**Work:**

- Create/link the Supabase project and local migration workflow.
- Define `profiles`, `listings`, and optional `listing_images` tables.
- Reuse the vehicle fields from `backend/app/listings/models.py`, adapting them to Supabase SQL.
- Use `auth.users.id` as listing ownership; do not duplicate authentication users.
- Add `active`/`deleted` status and indexes for public listing reads.
- Enable RLS for public active reads and owner-only writes.
- Keep city/location as stored fields; leave PostGIS/radius search for later.
- Decide whether Supabase Storage is needed after the stock-image UI is working.

**Exit criteria:** migrations apply, RLS policies are tested, and anonymous/public versus authenticated/owner access is demonstrated.

### [ ] Milestone 2: Web and authentication shell

**Goal:** A visitor can browse the site shell, and a user can authenticate.

**Work:**

- Scaffold the simple React/Next.js website.
- Add Supabase browser client using only the public/publishable key.
- Build email/password sign-up, sign-in, session restoration, and sign-out.
- Keep public browsing available before authentication.
- Add basic navigation between public listings and authenticated listing creation.

**Exit criteria:** a new user can sign up, refresh the page while signed in, sign out, and still browse while signed out.

### [ ] Milestone 3: Seller listing CRUD

**Goal:** An authenticated user can manage their vehicle listings.

**Work:**

- Build the listing form from the existing model fields.
- Validate required fields in the browser and at the database boundary.
- Implement create, read, update, and delete operations through Supabase.
- Enforce ownership through RLS, not only UI checks.
- Use a stock image or placeholder by default; keep actual upload optional.
- Do not build a polished dashboard; provide only the minimal “my listings” controls needed to make CRUD usable.

**Exit criteria:** one user can create, edit, and delete a listing, and another user cannot alter it.

### [ ] Milestone 4: Public listings feed

**Goal:** Visitors can see the marketplace inventory.

**Work:**

- Query only active listings.
- Render responsive listing cards with stock-image fallback.
- Add loading, empty, and error states.
- Add a basic detail view only if needed to make the listing understandable; keep sophisticated browse/search deferred.

**Exit criteria:** a signed-out visitor can load and understand the current active inventory.

### [ ] Milestone 5: MVP validation and deployment

**Goal:** Validate the end-to-end loop with minimal operations.

**Work:**

- Test Auth, RLS, listing CRUD, and public reads.
- Seed representative listings for development/demo.
- Deploy the Next.js site to a web host.
- Configure Supabase production environment variables and redirect URLs.
- Confirm no Railway service is needed.

**Exit criteria:** a real user can sign up, create a listing, sign out, and see that listing on the public site.

## Explicitly deferred

Seller dashboards, photo upload workflows, search/filtering, PostGIS radius search, messaging/contact, moderation, trust features, and AI capabilities are post-MVP decisions.

## Superseded planning

The previous Expo/FastAPI/Railway Phase 1–5 documents remain in `.planning/phases/` as historical research, but they are not the active execution plan. They should not be executed without re-alignment.

---
*Updated 2026-07-29 after product re-alignment.*
