# Roadmap: Revvbase Web MVP

## Overview

The roadmap validates the smallest useful marketplace loop first: secure Supabase data contracts, public browsing, email/password authentication, seller listing CRUD, and end-to-end validation. Supabase supplies PostgreSQL, Auth, generated data APIs, and Row Level Security; the historical FastAPI/Railway and Expo plans are not part of this roadmap. Web hosting is explicitly deferred until the user resumes it.

## Phases

- [x] **Phase 1: Supabase foundation** - Hosted schema, migrations, reference seed data, and RLS policies
- [x] **Phase 2: Web and authentication shell** - Responsive Next.js shell with Supabase email/password authentication
- [x] **Phase 3: Seller listing CRUD** - Owner-scoped listing creation and management
- [x] **Phase 4: Public listings feed** - Signed-out marketplace browsing with listing cards
- [x] **Phase 5: MVP validation** - End-to-end validation against the hosted Supabase backend

## Phase Details

### Phase 1: Supabase foundation

**Goal**: Establish the hosted database and security contracts without building application features.
**Depends on**: Nothing (first phase)
**Requirements**: [SEC-01, SEC-02, SEC-03]
**Success Criteria** (what must be TRUE):

  1. The `revvbase` Supabase project can recreate its public schema from committed migrations.
  2. Anonymous clients can read active listings and vehicle catalog rows but cannot write.
  3. Authenticated owners can create, read, update, and soft-delete only their own listings.
  4. Reference vehicle data is seeded reproducibly and schema/RLS checks pass against the hosted project.

**Plans**: 1 plan

Plans:

- [x] 01-01-PLAN.md - Create, deploy, and verify the hosted schema, seed, and RLS boundary

### Phase 2: Web and authentication shell

**Goal**: A visitor can browse the responsive site shell, and a user can authenticate with email/password.
**Depends on**: Phase 1
**Requirements**: [AUTH-01, AUTH-02, AUTH-03, AUTH-04]
**Success Criteria** (what must be TRUE):

  1. A visitor can open the responsive Next.js site without signing in.
  2. A user can sign up and sign in with email/password.
  3. The authenticated session survives a page reload and the user can sign out.
  4. Browser configuration contains only the Supabase publishable key, never service-role credentials.

**Plans**: 1 plan

Plans:

- [x] 02-01-PLAN.md - Build responsive shell and persistent email/password Auth

### Phase 3: Seller listing CRUD

**Goal**: An authenticated user can create and minimally manage their vehicle listings through Supabase.
**Depends on**: Phase 2
**Requirements**: [LIST-01, LIST-02, LIST-03, LIST-04, LIST-05]
**Success Criteria** (what must be TRUE):

  1. An authenticated user can create a listing with the required vehicle and sale details.
  2. The listing is owned by the authenticated Supabase user.
  3. The owner can view, edit, and soft-delete the listing through minimal management controls.
  4. A different authenticated user cannot alter or delete the listing.
  5. Listings without uploaded images use a stock placeholder.

**Plans**: 1 plan

Plans:

- [x] 03-01-PLAN.md - Build validated owner listing CRUD and soft deletion

### Phase 4: Public listings feed

**Goal**: Signed-out visitors can understand the active marketplace inventory.
**Depends on**: Phase 3
**Requirements**: [BROW-01, BROW-02, BROW-03]
**Success Criteria** (what must be TRUE):

  1. A signed-out visitor can load active listings from Supabase.
  2. Listing cards identify the vehicle, price, city, and image or stock placeholder.
  3. Loading, empty, and error states are visible and understandable.
  4. Soft-deleted listings never appear in the public feed.

**Plans**: 1 plan

Plans:

- [x] 04-01-PLAN.md - Build public active-listing feed and responsive cards

### Phase 5: MVP validation

**Goal**: Validate the complete public-browse and seller-listing loop locally against hosted Supabase without deploying the web application.
**Depends on**: Phase 4
**Requirements**: None (deployment and end-to-end validation)
**Success Criteria** (what must be TRUE):

  1. A real user can sign up, create a listing, sign out, and see the active listing publicly.
  2. Auth, RLS, owner CRUD, and public-read acceptance checks pass in the hosted environment.
  3. Representative demo listings are available without exposing real user data or privileged credentials.
  4. The Next.js application passes typecheck, tests, a production build, and representative desktop/mobile local runtime checks.

**Plans**: 1 plan

Plans:

- [x] 05-01-PLAN.md - Run release gates and prove the complete non-hosted MVP loop

## Progress

**Execution Order:** Phase 1 -> Phase 2 -> Phase 3 -> Phase 4 -> Phase 5

| Phase | Plans Complete | Status | Completed |
|---|---:|---|---|
| 1. Supabase foundation | 1/1 | Complete | 2026-07-30 |
| 2. Web and authentication shell | 1/1 | Complete | 2026-07-30 |
| 3. Seller listing CRUD | 1/1 | Complete | 2026-07-30 |
| 4. Public listings feed | 1/1 | Complete | 2026-07-30 |
| 5. MVP validation | 1/1 | Complete | 2026-08-01 |

## Explicitly Deferred

Production web hosting and production-origin smoke testing are explicitly deferred by the user. Seller dashboards, photo uploads and galleries, advanced search/filtering, PostGIS radius search, messaging/contact, moderation, trust features, and AI capabilities remain post-MVP decisions.

### Phase 6: Listing image management

**Goal:** Authenticated sellers can securely manage ordered public listing photos and config-driven draft publication while visitors see only active listings with a reliable cover image or placeholder.
**MVP delivery note:** Image objects use stable public URLs even for drafts; only draft listing records and image metadata are owner-only in the application. Private draft staging/promotion is deferred production hardening.
**Requirements**: [IMG-01, IMG-02, IMG-03, IMG-04, IMG-05]
**Depends on:** Phase 5
**Plans:** 2/6 plans executed

Plans:

- [x] 06-01-PLAN.md — Build config-driven client image normalization and approved HEIC support
- [x] 06-02-PLAN.md — Establish storage-neutral persistence, drafts, and status/RLS boundaries
- [ ] 06-03-PLAN.md — Implement protected config-driven publication and cleanup lifecycle
- [ ] 06-04-PLAN.md — Add independent draft-aware seller photo-management controls
- [ ] 06-05-PLAN.md — Cut public/owner consumers over to ordered images and protected lifecycle
- [ ] 06-06-PLAN.md — Run automated, hosted, responsive, and browser acceptance gates

---
*Converted to GSD phase format on 2026-07-30 after the Supabase web-MVP realignment.*
