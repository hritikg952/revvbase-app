# Requirements: Revvbase

**Defined:** 2026-05-03
**Core Value:** A seller can list their 2-wheeler in under 5 minutes, and a buyer can find and evaluate it from anywhere in India — no calls, no middlemen, no friction.

## v1 Requirements

### Authentication

- [ ] **AUTH-01**: User can browse the listings feed and view vehicle detail pages without logging in
- [ ] **AUTH-02**: User can sign up and log in via Phone OTP (MSG91)
- [ ] **AUTH-03**: User session persists across app restarts (JWT access + refresh tokens stored in SecureStore)
- [ ] **AUTH-04**: User can log out and have their session invalidated

### Listings

- [ ] **LIST-01**: Seller can create a vehicle listing with required fields: vehicle type, make, model, year of manufacture, odometer reading (km), asking price (₹), city, fuel type, number of previous owners, insurance validity date
- [ ] **LIST-02**: Seller can upload 1–10 photos per listing via direct Cloudinary signed upload
- [ ] **LIST-03**: Seller can add a freeform description to their listing (optional)
- [ ] **LIST-04**: Seller can add EV-specific fields (battery health %, estimated range km, charging type) when vehicle type is "Electric 2-Wheeler"
- [ ] **LIST-05**: Seller can edit their own active listing
- [ ] **LIST-06**: Seller can delete their own listing
- [ ] **LIST-07**: Seller can mark their own listing as "Sold"
- [ ] **LIST-08**: Seller is limited to 5 active (non-sold) listings at any time

### Browse

- [ ] **BROW-01**: User can browse a paginated feed of active (non-sold) listings on the home screen
- [ ] **BROW-02**: Listing card displays cover photo, vehicle type badge, make + model + year, asking price, city, and odometer reading
- [ ] **BROW-03**: Feed loads additional listings on scroll (keyset pagination — no offset)

### Vehicle Detail

- [ ] **DETL-01**: User can view the full vehicle detail page with all listing fields
- [ ] **DETL-02**: Detail page shows all uploaded photos in a swipeable gallery
- [ ] **DETL-03**: Detail page shows seller's display name and listing creation date

### Seller Management

- [ ] **SMGR-01**: Seller can view a list of their own listings (active, sold) from their profile
- [ ] **SMGR-02**: Seller profile displays their phone-verified status

## v2 Requirements

### Contact

- **CONT-01**: Buyer can reveal seller's phone number (gated by auth)
- **CONT-02**: Buyer can contact seller via WhatsApp deep link from the detail page
- **CONT-03**: In-app messaging between buyer and seller

### Discovery

- **DISC-01**: User can filter listings by vehicle type, city, price range, and year
- **DISC-02**: User can search listings by make and model
- **DISC-03**: User can browse listings within a configurable radius of their location (PostGIS)

### Intelligence

- **INTL-01**: OCR document scan to auto-fill listing fields from RC document
- **INTL-02**: AI-optimized image processing on upload (exposure, white balance, cropping)
- **INTL-03**: Price fairness indicator based on similar listings

### Trust & Safety

- **TRST-01**: Buyer can rate and review a seller after a transaction
- **TRST-02**: Seller listing auto-prompts "mark as sold" after 30 days of inactivity
- **TRST-03**: RC number verification via Vahan/NSDL API

### Platform

- **PLAT-01**: Push notifications for listing activity (new listing in followed search, price drop)
- **PLAT-02**: Ownership transfer paperwork assistance

## Out of Scope

| Feature | Reason |
|---------|--------|
| Buyer-seller contact (any form) | Explicitly deferred; architecture must not block adding later |
| Phone number reveal | Deferred with contact flow; no partial reveal in MVP |
| Filtering / search | v2; DB schema is filter-ready from day 1 |
| OCR document scanning | Future AI feature; significant complexity |
| AI image optimization | Future; Cloudinary handles basic transforms for MVP |
| Paperwork / ownership transfer | Long-term trust feature; requires legal and regulatory work |
| Seller / buyer ratings | Post-MVP trust layer |
| Dealer / commercial accounts | Avoid spam vectors in MVP; revisit with moderation tools |
| Auction / bidding | Different product model; not a classifieds pattern |
| Loan / financing integration | Out of scope for v1 marketplace |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| AUTH-01 | Phase 4 | Pending |
| AUTH-02 | Phase 2 | Pending |
| AUTH-03 | Phase 2 | Pending |
| AUTH-04 | Phase 2 | Pending |
| LIST-01 | Phase 3 | Pending |
| LIST-02 | Phase 3 | Pending |
| LIST-03 | Phase 3 | Pending |
| LIST-04 | Phase 3 | Pending |
| LIST-05 | Phase 5 | Pending |
| LIST-06 | Phase 5 | Pending |
| LIST-07 | Phase 5 | Pending |
| LIST-08 | Phase 5 | Pending |
| BROW-01 | Phase 4 | Pending |
| BROW-02 | Phase 4 | Pending |
| BROW-03 | Phase 4 | Pending |
| DETL-01 | Phase 4 | Pending |
| DETL-02 | Phase 4 | Pending |
| DETL-03 | Phase 4 | Pending |
| SMGR-01 | Phase 5 | Pending |
| SMGR-02 | Phase 5 | Pending |

**Coverage:**
- v1 requirements: 20 total
- Mapped to phases: 20 ✓
- Unmapped: 0

---
*Requirements defined: 2026-05-03*
*Last updated: 2026-05-03 after roadmap creation*
