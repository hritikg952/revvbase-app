# Roadmap: Revvbase

## Overview

Revvbase is built in five phases that follow the natural build order constraints of the stack: database foundation first, then the security-critical auth API with OTP rate limiting, then listing creation (the supply side), then the browsable feed and detail pages (the demand side), and finally the seller's management tools that close the loop. Each phase delivers a coherent, independently verifiable capability. The browse-first design (unauthenticated users can browse) is delivered in Phase 4 when the feed exists to browse.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Project scaffold, PostGIS-ready DB schema, Railway deployment pipeline
- [ ] **Phase 2: Authentication** - Phone OTP login, JWT session management, rate-limited auth API
- [ ] **Phase 3: Listing Creation** - Full listing creation API and RN screens with Cloudinary photo upload
- [ ] **Phase 4: Browse & Detail** - Unauthenticated browsable feed (FlashList) and full vehicle detail page
- [ ] **Phase 5: Seller Management** - Edit, delete, mark-sold, active cap enforcement, and seller profile

## Phase Details

### Phase 1: Foundation
**Goal**: The project infrastructure is in place — monorepo scaffolded, DB schema deployed with PostGIS and JSONB, Railway environment running, and Cloudinary + MSG91 credentials wired up
**Depends on**: Nothing (first phase)
**Requirements**: *(infrastructure phase — no direct v1 requirement IDs, but is a hard prerequisite for all phases)*
**Success Criteria** (what must be TRUE):
  1. FastAPI server starts and returns 200 on a health-check endpoint deployed to Railway
  2. PostgreSQL database on Railway has migration 001 applied: PostGIS extension enabled, JSONB attributes column present on the listings table, and all required indexes exist
  3. Cloudinary account is configured and a signed upload URL can be generated from the API
  4. MSG91 credentials are configured and a test OTP can be sent to a real phone number
  5. Expo app boots on a physical Android device and connects to the Railway API base URL
**Plans**: TBD

Plans:
- [ ] 01-01: Backend scaffold — FastAPI project structure, DB models (PostGIS-ready), Alembic migration 001, Railway deploy
- [ ] 01-02: Integrations setup — Cloudinary signed-upload config, MSG91 credentials, environment variable management
- [ ] 01-03: Expo scaffold — New Architecture project, navigation shell, API client base, design system tokens loaded

### Phase 2: Authentication
**Goal**: Users can sign up and log in via Phone OTP, sessions persist across app restarts, and the OTP endpoint is rate-limited before any public URL is accessible
**Depends on**: Phase 1
**Requirements**: AUTH-02, AUTH-03, AUTH-04
**Success Criteria** (what must be TRUE):
  1. User enters a phone number, receives an OTP SMS, enters the code, and lands on the home screen as an authenticated user
  2. User closes and reopens the app and remains logged in (JWT stored in expo-secure-store, refresh token cycle working)
  3. User taps Log Out and is returned to the phone number entry screen; subsequent API calls with the old token are rejected
  4. Sending more than 3 OTP requests from the same IP within 60 seconds is rejected with a 429 response (OTP bombing protection active)
  5. MSG91 DLT template registration has been submitted (required for Indian SMS delivery; approval takes days to weeks)
**Plans**: TBD

Plans:
- [ ] 02-01: Auth API — /auth/send-otp, /auth/verify-otp, /auth/refresh, /auth/logout endpoints with slowapi rate limiting and MSG91 spend cap configured
- [ ] 02-02: RN Auth screens — Phone entry screen, OTP verification screen, JWT stored in expo-secure-store, auth state machine, session restoration on app start

### Phase 3: Listing Creation
**Goal**: An authenticated seller can create a complete vehicle listing with photos and all required fields in under 5 minutes
**Depends on**: Phase 2
**Requirements**: LIST-01, LIST-02, LIST-03, LIST-04
**Success Criteria** (what must be TRUE):
  1. Seller completes the listing form (vehicle type, make, model, year, odometer, price, city, fuel type, previous owners, insurance validity) and the listing is saved to the database
  2. Seller uploads 1–10 photos; each photo goes directly from the device to Cloudinary via a server-signed upload URL (never passing through Railway), and Cloudinary URLs are stored on the listing
  3. Seller optionally adds a freeform description and it is saved and retrievable
  4. When vehicle type is "Electric 2-Wheeler", the EV-specific fields (battery health %, range, charging type) are shown and their values are persisted in the JSONB attributes column
**Plans**: TBD

Plans:
- [ ] 03-01: Listing API — POST /listings, Cloudinary signed-upload endpoint, JSONB EV fields, listing schema validation
- [ ] 03-02: RN listing creation screens — multi-step form, photo picker with direct Cloudinary upload, EV fields conditional section, submission flow

### Phase 4: Browse & Detail
**Goal**: Any user (logged in or not) can browse a fast, paginated feed of active listings and view a full vehicle detail page
**Depends on**: Phase 3
**Requirements**: AUTH-01, BROW-01, BROW-02, BROW-03, DETL-01, DETL-02, DETL-03
**Success Criteria** (what must be TRUE):
  1. A user who has never signed in opens the app and sees a feed of active listings — no login gate
  2. Each listing card in the feed shows the cover photo, vehicle type badge, make + model + year, asking price, city, and odometer reading
  3. Scrolling to the bottom of the feed loads the next page of listings without a visible jump or offset artifact (keyset cursor pagination); feed is rendered with FlashList and memoized cards
  4. Tapping a card opens the detail page showing all listing fields, a swipeable photo gallery of all uploaded photos, the seller's display name, and the listing creation date
**Plans**: TBD

Plans:
- [ ] 04-01: Browse API — GET /listings (keyset pagination, eager-loaded cover photo), GET /listings/{id} (full detail with all photos), unauthenticated access allowed
- [ ] 04-02: RN feed screen — FlashList with memoized ListingCard, keyset cursor state, cover photo via Cloudinary transform URL
- [ ] 04-03: RN detail screen — full fields layout, swipeable photo gallery, seller info, matches design system
**UI hint**: yes

### Phase 5: Seller Management
**Goal**: A seller can view, edit, delete, and mark their listings as sold from their profile, and the 5-listing active cap is enforced
**Depends on**: Phase 4
**Requirements**: LIST-05, LIST-06, LIST-07, LIST-08, SMGR-01, SMGR-02
**Success Criteria** (what must be TRUE):
  1. Seller opens their profile and sees a list of all their listings grouped by status (active vs. sold)
  2. Seller edits an active listing (any field or photo), saves it, and the updated listing is immediately visible on the feed
  3. Seller deletes a listing and it disappears from the feed and from their profile listing
  4. Seller marks a listing as "Sold" and it moves to the sold group in their profile; it no longer appears in the public feed
  5. A seller with 5 active listings attempts to create a 6th and receives an error; the profile badge displays their phone-verified status
**Plans**: TBD

Plans:
- [ ] 05-01: Seller management API — PATCH /listings/{id}, DELETE /listings/{id}, PATCH /listings/{id}/status, active listing cap enforcement (HTTP 403 on 6th), GET /users/me/listings
- [ ] 05-02: RN seller profile + management screens — My Listings screen (active/sold tabs), edit listing flow, delete confirmation, mark-sold action, phone-verified badge
**UI hint**: yes

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3 → 4 → 5

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 0/3 | Not started | - |
| 2. Authentication | 0/2 | Not started | - |
| 3. Listing Creation | 0/2 | Not started | - |
| 4. Browse & Detail | 0/3 | Not started | - |
| 5. Seller Management | 0/2 | Not started | - |
