# Revvbase

## What This Is

Revvbase is a mobile-first second-hand 2-wheeler marketplace for India, where sellers can list their used motorcycles, scooters, electric 2-wheelers, and bicycles, and buyers can browse and view detailed listings. It is the "Spinny for 2-wheelers" — a single trusted destination for the segment that currently has no dedicated platform.

## Core Value

A seller can list their 2-wheeler in under 5 minutes, and a buyer can find and evaluate it from anywhere in India — no calls, no middlemen, no friction.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] User can sign up and log in via Phone OTP (MSG91)
- [ ] Seller can create a vehicle listing with photos and full details
- [ ] Listings appear on a browsable home screen
- [ ] Buyer can view a full vehicle detail page
- [ ] Seller can manage (edit/delete) their own listings
- [ ] Listings include: vehicle type, make, model, year, odometer, price, city, fuel type, number of previous owners, insurance validity, and photos

### Out of Scope

- In-app buyer-seller contact / messaging — deferred to post-MVP; architecture must not block this
- Filtering / search by specs or location radius — v2; PostGIS-ready DB from day 1
- OCR document scanning for auto-fill — future AI feature
- AI image optimization — future; Cloudinary handles basic transforms for MVP
- Paperwork and ownership transfer system — long-term trust feature
- Seller/buyer ratings and reviews — deferred post-MVP

## Context

- **Market:** India. No dedicated second-hand 2-wheeler marketplace exists at scale (OLX exists but is generic and untrustworthy; Cars24/Spinny only do cars).
- **Users:** Mobile-first Indian users. Phone OTP is the standard auth pattern (familiar from WhatsApp, Paytm, etc.).
- **Design:** Dark-mode design system already created (`design/`). Brand: Space Grotesk, Electric Red CTAs, Nitro Blue accents, tonal elevation without shadows.
- **Vehicle types:** Motorcycles, Scooters, Electric 2-wheelers, Bicycles — all under one roof, categorized.
- **Trust signal for MVP:** Phone verification via OTP login. Explicit trust features (inspection, ratings, document verification) are future work.

## Constraints

- **Platform:** React Native (New Architecture) — Android + iOS from one codebase
- **Budget:** Target < $20/month for MVP infrastructure (Railway for API + DB)
- **Stack:** FastAPI (Python) + PostgreSQL + Cloudinary + MSG91 — chosen for simplicity, low cost, and future scalability
- **Scalability:** Database must be PostGIS-ready for future radius-based location search
- **No DevOps complexity:** No managed Kubernetes, no ECS/Fargate — Railway deployment for MVP

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| React Native over web-first | Indian users are mobile-first; app store presence builds trust | — Pending |
| FastAPI over Node.js | Python ecosystem suits future AI/OCR features (same language); FastAPI is fast to build | — Pending |
| Railway over AWS for MVP | AWS adds DevOps complexity before product-market fit; Railway is < $20/month with one deploy command | — Pending |
| Cloudinary for images | Handles upload, resize, CDN delivery, and basic optimization — replaces S3 + Celery + Redis for MVP | — Pending |
| MSG91 for OTP | Indian provider, cheap, reliable, widely used in production apps | — Pending |
| Mock OTP for MVP | Skip MSG91 DLT registration complexity during development; hardcode OTP (e.g. `123456`) with a config flag — swap to real MSG91 before production launch | — Pending |
| PostgreSQL over Firestore | Relational queries, future PostGIS for radius search, familiar for structured marketplace data | — Pending |
| Buyer-seller contact deferred | Core value is discovery, not communication — avoid scope creep on v1 | — Pending |

## Evolution

This document evolves at phase transitions and milestone boundaries.

**After each phase transition** (via `/gsd-transition`):
1. Requirements invalidated? → Move to Out of Scope with reason
2. Requirements validated? → Move to Validated with phase reference
3. New requirements emerged? → Add to Active
4. Decisions to log? → Add to Key Decisions
5. "What This Is" still accurate? → Update if drifted

**After each milestone** (via `/gsd-complete-milestone`):
1. Full review of all sections
2. Core Value check — still the right priority?
3. Audit Out of Scope — reasons still valid?
4. Update Context with current state

---
*Last updated: 2026-05-03 after initialization*
