# Revvbase

## What This Is

Revvbase is a simple web marketplace for second-hand two-wheelers in India. A user can browse vehicles publicly, create an account, and list a motorcycle, scooter, electric two-wheeler, or bicycle for sale. The same account can act as both buyer and seller.

## MVP Core Value

A visitor can discover available two-wheelers, and an authenticated user can publish a vehicle listing with the key details needed to start a sale.

## MVP Scope

- Public browsing without authentication.
- Email/password sign-up, sign-in, session persistence, and sign-out.
- One user model; no buyer/seller role split.
- Authenticated seller can create, read, update, and delete their own listings.
- Minimal management controls may be included so CRUD is usable; a polished seller dashboard is deferred.
- Public page iterates over active listings and renders listing cards.
- Optional image field with a stock-image fallback for UI development.
- City/location field stored now, but sophisticated location search deferred.
- A polished seller dashboard, moderation, messaging, contact reveal, and advanced discovery are deferred.

## Product Context

- Market: India.
- Vehicle types: motorcycle, scooter, electric two-wheeler, bicycle.
- The first release validates the basic supply-and-demand loop, not trust, messaging, or pricing intelligence.
- A seller dashboard is architecturally allowed but is not part of the first public MVP.

## Constraints

- Platform: responsive web application.
- Frontend direction: simple React/Next.js application.
- Backend direction: Supabase hosted PostgreSQL, Auth, Row Level Security, and optionally Storage/Edge Functions.
- Railway is not required for the MVP.
- Keep infrastructure minimal; do not introduce a custom API server unless a concrete requirement requires it.
- PostGIS-ready schema is desirable, but radius search is deferred.

## Key Decisions

| Decision | Rationale | Outcome |
|---|---|---|
| Web over Expo | Faster validation and simpler distribution for this marketplace MVP | Adopted |
| Next.js/React direction | Simple, familiar web stack with room for SEO and server rendering later | Provisional |
| Supabase over custom FastAPI + Railway | Auth, PostgreSQL, RLS, API access, and optional storage in one managed backend | Adopted for MVP planning |
| Email/password auth | User explicitly does not need phone OTP yet | Adopted |
| One user can buy and sell | Avoid role complexity until the marketplace behavior is validated | Adopted |
| Direct Supabase client with RLS | Avoid a custom API layer for basic CRUD | Adopted for MVP planning |
| Optional images | Vehicle data flow is the first validation; use stock imagery while image upload is deferred | Adopted |
| Location stored, search deferred | Preserve future path to PostGIS without expanding MVP scope | Adopted |
| Seller dashboard deferred | CRUD is required, but a dedicated management UI is not part of the first public MVP | Adopted |
| Moderation deferred | No admin workflow until marketplace usage justifies it | Adopted |

## Deferred After MVP

- Seller dashboard and richer listing management UI.
- Image upload and image management, if stock imagery is insufficient.
- Filters, text search, and radius search.
- Buyer-seller contact, WhatsApp, and messaging.
- Moderation/admin tools.
- Ratings, reviews, verification, OCR, price guidance, notifications, and paperwork assistance.

---
*Updated 2026-07-29 after product re-alignment.*
