# Requirements: Revvbase MVP

**Defined:** 2026-07-29
**Core value:** A visitor can discover two-wheelers, and an authenticated user can publish a listing with the key details needed to start a sale.

## MVP Requirements

### Authentication

- [x] **AUTH-01**: A visitor can browse active listings without signing in.
- [x] **AUTH-02**: A user can create an account and sign in with email/password.
- [x] **AUTH-03**: A signed-in session persists across page reloads and the user can sign out.
- [x] **AUTH-04**: The same user can both browse as a buyer and create listings as a seller; there is no role-selection flow.

### Listings

- [x] **LIST-01**: An authenticated user can create a listing with vehicle type, make, model, year, odometer, price, city/location, fuel type, previous owners, insurance validity, and optional description.
- [x] **LIST-02**: A listing is stored with the authenticated user's ID as its owner.
- [x] **LIST-03**: An authenticated user can read, update, and delete their own listings.
- [x] **LIST-04**: Listing status supports at least `active` and `deleted`; deleted listings are excluded from public browsing.
- [x] **LIST-05**: Image data is optional. The UI can render a stock placeholder when no image exists.

### Public browsing

- [x] **BROW-01**: The public website queries active listings from Supabase and renders them as listing cards.
- [x] **BROW-02**: A listing card displays enough information to identify the vehicle and price, including an image or stock placeholder.
- [x] **BROW-03**: Loading, empty, and error states are visible and understandable.

### Security and data rules

- [x] **SEC-01**: Row Level Security prevents unauthenticated writes.
- [x] **SEC-02**: A user cannot update or delete another user's listing.
- [x] **SEC-03**: The public client never contains a Supabase service-role key.

## Deferred Requirements

These remain valid product ideas but are not MVP acceptance criteria:

- Seller dashboard UI.
- Sophisticated city/location filters and PostGIS radius search.
- Image upload and photo galleries beyond the stock-image fallback.
- Buyer-seller contact, phone reveal, WhatsApp, and messaging.
- Moderation/admin tools.
- Ratings, reviews, trust verification, OCR, AI image processing, price fairness, notifications, and paperwork assistance.

## Traceability

| Requirement group | Planned milestone | Status |
|---|---|---|
| AUTH-01..04 | 2. Authentication | Complete |
| LIST-01..05 | 3. Seller listing CRUD | Complete |
| BROW-01..03 | 4. Public browse | Complete |
| SEC-01..03 | 1. Supabase foundation | Complete |

**Coverage:** 15 MVP acceptance criteria; 15 implemented/validated.

---
*Updated 2026-07-29 after product re-alignment.*
