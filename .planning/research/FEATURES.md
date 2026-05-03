# Feature Research

**Domain:** Second-hand 2-wheeler marketplace (India)
**Researched:** 2026-05-03
**Confidence:** MEDIUM-HIGH (based on knowledge of OLX, Quikr, Cars24, Spinny, Droom, BikeWale, Paytm, WhatsApp — web search unavailable; flagged where uncertain)

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that every Indian marketplace user assumes exist. Missing any of these makes the product feel broken or amateur.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Phone OTP login | Indian users authenticate via phone everywhere — WhatsApp, Paytm, Ola, Swiggy. Email login feels foreign. | LOW | MSG91 chosen. No password to remember. |
| Vehicle listing creation with photos | Listings without photos are ignored. Indian classifieds users skip photo-less ads instinctively (learned from OLX behavior). | MEDIUM | Multi-photo upload, at least 3-5 photos minimum enforced. Cloudinary handles resize + CDN. |
| Price display (not "call for price") | OLX's "call for price" pattern erodes trust. Users want upfront pricing to filter mentally before tapping. | LOW | Required field on listing. |
| Seller phone number / contact reveal | Indian buyers expect to call or WhatsApp the seller directly. The dominant contact mode is WhatsApp, not in-app messaging. | LOW | MVP: show verified phone. Post-MVP: in-app chat. Architecture must not block chat layer. |
| City / location field | India has massive geographic variance in pricing (Mumbai vs Tier 3 city). Buyers want to know if delivery is feasible or if they need to travel. | LOW | City (text/dropdown) for MVP. Radius search deferred to v2 (PostGIS ready). |
| Vehicle specs: make, model, year, odometer | This is the minimum information a buyer uses to evaluate. Missing any = immediate distrust. | LOW | All required fields already in PROJECT.md scope. |
| Fuel type field | Petrol / diesel / electric / CNG matters enormously in India for running costs. EV buyers filter on this explicitly. | LOW | Required. Especially relevant as EV adoption grows. |
| Number of previous owners | Single-owner bikes command a significant premium. Multi-owner signals potential abuse. Indian used-vehicle buyers ask this before anything else. | LOW | Required field. Already in scope. |
| Insurance validity date | In India, vehicle insurance is legally mandatory and buyers request this upfront. Expired insurance is a red flag and re-registration cost signal. | LOW | Required field. Already in scope. |
| Home feed / browsable listings | Users need to be able to scroll listings without knowing what they're looking for. Discovery drives impulse buys. | MEDIUM | Paginated feed, newest first for MVP. Infinite scroll preferred on mobile. |
| Vehicle detail page | Full listing view with all specs, photos gallery, price, and seller contact. This is the conversion point. | MEDIUM | Photo carousel, full specs table, CTA to contact seller. |
| Seller's own listings management | Sellers need to edit price, mark as sold, or delete listings. Without this, stale listings pile up and destroy buyer trust. | MEDIUM | Edit + delete + sold marking. Already in PROJECT.md scope. |
| "Mark as Sold" | Sold listings remaining active is the #1 trust-killer on OLX. Buyers click, call, find it's gone. Drives abandonment. | LOW | Simple sold flag. Sold listings filtered from feed by default. |
| Vehicle type categorization | Motorcycles, scooters, EVs, and bicycles have different audiences. Mixed uncategorized feeds frustrate users. | LOW | Category filter on feed. Already designed into the data model. |

---

### Differentiators (Competitive Advantage Over OLX-Style Classifieds)

These are what make Revvbase worth using instead of OLX. Do not try to differentiate on all of them — pick the ones that compound.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| 2-wheeler-specific spec fields | OLX is generic — no odometer, no fuel type, no engine CC, no insurance fields. Revvbase's structured data makes listings immediately scannable and filterable. This is the core moat. | LOW-MEDIUM | Engine CC, tyre condition, battery health (for EVs), service history checkbox — these fields don't exist on OLX. |
| Mandatory photo enforcement | OLX allows photo-less listings. Requiring 3+ photos and enforcing minimum resolution dramatically improves listing quality. Quality listings attract serious buyers. | LOW | Client-side validation. Cloudinary upload flow. |
| Phone-verified seller identity | OTP-verified seller phone = real person, not a bot or scammer. Display "Verified Seller" badge against each listing. | LOW | Flows from OTP auth already built. Just a UI badge. |
| Structured search and filtering | OLX's search is keyword-only and generic. Revvbase can offer: filter by vehicle type, city, price range, year range, fuel type, odometer range. | MEDIUM | PostGIS already planned. Price/year/type filters are pure SQL. Ship basic filters in v1.x. |
| EV-specific listing fields | No Indian platform has dedicated EV fields: battery health %, charge range, charging type (fast/slow), battery warranty remaining. EV adoption is accelerating (Ola Electric, Ather, TVS iQube). First-mover advantage. | MEDIUM | EV is a separate vehicle type with conditional fields. Store as JSONB for flexibility. |
| RC (Registration Certificate) number verification | Buyer can enter RC number to verify ownership matches the seller. Droom does this but it's buried. Make it a prominent trust signal. | HIGH | Requires Vahan/NSDL API integration. Defer to v2 but design listing schema to store RC number from day 1. |
| Price fairness indicator | Show "Below Market / Fair / Above Market" based on make/model/year/odometer median across platform listings. Cars24 does this for cars. No one does it for 2-wheelers. | HIGH | Requires sufficient listing volume. Defer to v2 — but log the data from day 1. |
| Inspection report (seller self-report) | Seller fills a structured checklist (brakes, tyres, electrical, engine start). Not professional inspection, but structured self-disclosure builds trust over bare classifieds. | MEDIUM | Simple JSON checklist stored on listing. Renders as visual health card on detail page. |
| WhatsApp share button | Indian users discover vehicles, screenshot them, and send to family for a second opinion before buying. Native WhatsApp share with listing URL + photo + price + specs compresses this flow. | LOW | React Native Share API. Deep link to listing. High virality impact. |
| Saved / Wishlist | Buyers compare 3-5 listings before deciding. Without save, they lose listings and return to generic Google search. Saves = return traffic signals. | LOW-MEDIUM | Requires auth (already in scope). Local store for guests, DB for logged-in. |
| Seller response rate badge | Shows "Typically replies within 2 hours." Creates seller accountability pressure. Reduces ghosting, which is the #1 OLX complaint. | MEDIUM | Requires contact interaction tracking. Post-MVP when messaging ships. |

---

### Anti-Features (Deliberately Do Not Build in MVP)

These features are frequently requested or seem obvious, but cause more harm than good at this stage.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| In-app buyer-seller chat | "OLX has it" — users expect it | Chat requires moderation, spam prevention, notification infrastructure, read receipts, offline queue. Building this before the listing discovery loop is validated is classic premature complexity. Also traps users in-app when WhatsApp is superior for their context. | Show verified phone number. Add WhatsApp deep link. Build in-app chat in v1.x once contact patterns are understood. |
| AI photo enhancement / background removal | Polished listing photos increase buyer trust | Cloudinary transformation can handle basic resize and format conversion. Full AI background removal (like Cars24 studio mode) requires significant prompt engineering, cost, and latency. Ships buggy in MVP. | Enforce minimum 3 photos + natural light tips shown in upload UI. AI enhancement in v2. |
| EMI / financing calculator | "Buyers want to know if they can afford it" | Requires lender partnerships, NBFC API integrations, KYC flow. Complexity is 10x the apparent scope. Distracts from core marketplace loop. | Show price clearly. Add "Compare on BankBazaar" link if needed. |
| Platform-facilitated transaction / escrow | "Make buying safe" | Escrow requires RBI payment aggregator compliance (PA license), legal liability, dispute resolution teams. Cannot ship in MVP. | Focus on discovery. Trust through verification badges, not payment control. |
| Push notification overload | "Keep users engaged" | Spammy push notifications cause instant uninstall in Indian apps (learned behavior from Quikr, Snapdeal). Users have notification fatigue. | Ship push only for: (1) your listing got a view, (2) saved listing price dropped. No marketing pushes. |
| Dealer/commercial listings | "More supply is better" | Individual sellers and dealer behavior differ sharply. Dealers spam listings, post the same vehicle 10 times, and destroy feed quality. Quikr's feed is now unusable because of this. | Restrict to individual sellers in MVP. Dealer tier is a separate product decision for v2 with stricter controls. |
| Auction / bidding | "Price discovery" | Auction mechanics require escrow, time-bound UX, bid retraction rules, fraud prevention. No Indian 2-wheeler buyer expects to bid — they expect to negotiate directly with the seller. | Direct seller contact. Price is fixed but negotiation is implicit and expected in Indian culture. |
| Real-time RC/RTO data auto-fill | "Reduce friction for sellers" | Vahan API is unreliable, rate-limited, and often returns stale data. Building dependency on it in MVP creates brittle onboarding. | Manual entry for MVP. RC field stored in DB for future verification feature. |

---

## Feature Dependencies

```
OTP Login
    └──required by──> Listing Creation (seller must be verified)
    └──required by──> Saved Listings (must know who saved what)
    └──required by──> Seller Listing Management (edit/delete own listings)
    └──enables──> Verified Seller Badge (flows from phone verification)

Listing Creation
    └──required by──> Home Feed (feed needs listings to show)
    └──required by──> Vehicle Detail Page (detail page renders a listing)
    └──required by──> Seller Listing Management (must exist before it can be managed)

Home Feed
    └──enhanced by──> Filtering / Search (filter narrows the feed)
    └──enhanced by──> Saved Listings (highlight already-saved in feed)
    └──feeds into──> Vehicle Detail Page (tapping a card opens detail)

Vehicle Detail Page
    └──enhanced by──> WhatsApp Share Button (share from detail page)
    └──enhanced by──> Inspection Report (shown on detail page)
    └──enhanced by──> Verified Seller Badge (shown on detail page)
    └──enables──> Seller Contact (phone reveal lives here)

Filtering / Search
    └──requires──> Listing Creation (needs data to filter)
    └──depends on──> PostGIS (for location radius — v2 only)

Price Fairness Indicator
    └──requires──> Sufficient listing volume (statistical validity)
    └──requires──> Consistent structured data (make/model/year/odometer mandatory)

RC Verification
    └──requires──> RC number field on listing (store from day 1)
    └──requires──> Vahan/NSDL API integration (v2)

EV-specific fields
    └──requires──> Vehicle type = EV selected (conditional field rendering)
    └──enhanced by──> Battery health field (EV differentiator)
```

### Dependency Notes

- **OTP Login gates everything seller-side:** Listing creation, management, and identity trust all depend on phone verification being in place first. This is correctly the first feature built.
- **Listings before feed, feed before detail:** The data model must exist before the browsing surface. Build in this order.
- **PostGIS must be schema-ready from day 1:** Even though radius search is v2, the column (`location GEOGRAPHY`) must be added in the initial migration. Retrofitting PostGIS into a large table is painful.
- **RC number field should be in the listing schema from day 1:** Even if verification is v2, storing the field enables future verification without a migration.
- **EV fields as conditional JSONB:** Rather than separate tables, store EV-specific fields (battery_health_percent, range_km, charging_type) as JSONB on the listing. This avoids null columns for non-EV listings.

---

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the core loop: can sellers list, and can buyers find and evaluate?

- [x] Phone OTP login — identity foundation, gates all seller actions
- [x] Listing creation with photos, all required fields — the supply side
- [x] Home feed (paginated, newest first) — the demand side
- [x] Vehicle detail page with full specs, photo carousel, seller phone reveal — the conversion point
- [x] Seller listing management (edit, delete, mark as sold) — without this, stale listings kill buyer trust
- [x] Vehicle type categorization (motorcycle / scooter / EV / bicycle) — minimum usable segmentation
- [x] Verified seller badge (OTP-verified phone = badge) — zero-cost trust signal from existing auth

### Add After Validation (v1.x)

Ship once core loop is validated (users are listing and buyers are contacting sellers).

- [ ] Basic filtering — vehicle type, city, price range — trigger: >50 active listings, filter UX needed
- [ ] Saved / wishlist — trigger: users asking "how do I go back to that listing?"
- [ ] WhatsApp share button — trigger: first week analytics; if users are screenshotting and sharing, build native share
- [ ] Self-reported inspection checklist — trigger: buyer feedback indicating trust gap
- [ ] Seller response rate badge — trigger: when in-app contact or call-tracking is added

### Future Consideration (v2+)

Defer until product-market fit established (consistent weekly listings + buyer contact activity).

- [ ] In-app buyer-seller messaging — significant infrastructure; WhatsApp is good enough until scale demands it
- [ ] RC / Vahan API verification — high complexity, unreliable API; must be treated as enhancement not foundation
- [ ] Price fairness indicator — needs statistical volume (>500 comparable listings) to be credible
- [ ] EV battery health and range fields — important but small market share today; design schema to support, ship when EV listings reach meaningful volume
- [ ] Radius-based location search (PostGIS) — high buyer value but requires schema prep (day 1) and query layer work
- [ ] Dealer / commercial seller tier — separate product decision with anti-spam controls
- [ ] AI photo enhancement — Cloudinary handles basics; full AI is v2 premium feature

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| OTP Login | HIGH | LOW | P1 |
| Listing creation with photos | HIGH | MEDIUM | P1 |
| Home feed | HIGH | MEDIUM | P1 |
| Vehicle detail page | HIGH | MEDIUM | P1 |
| Seller listing management | HIGH | MEDIUM | P1 |
| Mark as sold | HIGH | LOW | P1 |
| Verified seller badge | HIGH | LOW | P1 |
| Vehicle type categorization | MEDIUM | LOW | P1 |
| Basic filtering (type, city, price) | HIGH | MEDIUM | P2 |
| Saved / wishlist | MEDIUM | LOW | P2 |
| WhatsApp share | HIGH | LOW | P2 |
| Inspection checklist (self-report) | MEDIUM | MEDIUM | P2 |
| EV-specific fields | MEDIUM | MEDIUM | P2 |
| In-app messaging | HIGH | HIGH | P3 |
| RC verification (Vahan API) | HIGH | HIGH | P3 |
| Price fairness indicator | HIGH | HIGH | P3 |
| Radius search (PostGIS) | HIGH | HIGH | P3 |
| Dealer tier | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch
- P2: Should have, add when possible
- P3: Nice to have, future consideration

---

## Competitor Feature Analysis

| Feature | OLX India | Cars24 / Spinny | BikeWale / BikedekHo | Revvbase Approach |
|---------|-----------|-----------------|----------------------|-------------------|
| Vehicle type | Generic (any vehicle) | Cars only | New bikes only (dealer) | 2-wheelers only, all types — dedicated and segmented |
| Listing fields | Generic title + description | Structured, car-specific | Structured, new bikes | Structured, 2-wheeler-specific with EV conditional fields |
| Photos | Optional, often absent | Mandatory, professional | Dealer studio photos | Mandatory minimum 3, natural light tips, future AI enhancement |
| Seller identity | Unverified | KYC verified (dealer) | Dealers only | Phone-verified individual sellers, Verified badge |
| Contact method | Phone reveal (after login) | In-app + call | Dealer showroom | Phone reveal + WhatsApp deep link (v1), in-app messaging (v2) |
| Trust signals | None | Inspection + warranty | New bike specs | OTP badge, self-reported inspection checklist (v1.x), RC verification (v2) |
| Search / filter | Keyword + city | Make/model/budget/year | Category + brand | Vehicle type, city, price, year, fuel type, odometer (v1.x) |
| EV support | Generic listing | Not applicable | Limited (new EV only) | Dedicated EV category with battery/range fields — first-mover |
| Mobile UX | Cluttered, ad-heavy | Clean, car-focused | Catalogue-style | Mobile-first dark design, minimal ads in MVP |
| Pricing guidance | None | Instant valuation (cars) | MSRP (new only) | Price fairness indicator (v2, needs volume) |

---

## India-Specific Behavioral Notes

These observations are drawn from patterns across OLX, Quikr, Paytm, Cars24, WhatsApp, and Swiggy — all of which shaped Indian mobile user expectations.

**Trust is earned through signals, not systems.** Indian users do not inherently trust platforms. They trust phone numbers (real people), photos (proof of existence), and verification badges. A "Verified" badge next to a phone number dramatically increases contact rates — even if the verification is just OTP.

**WhatsApp is the dominant communication layer.** Indian buyers do not want in-app chat — they want to move to WhatsApp immediately. Any friction in getting to the seller's number causes abandonment. Show the phone number prominently on the detail page. Add a "Chat on WhatsApp" button early.

**Price negotiation is expected and culturally implicit.** Posted price is an opening bid, not a final price. Do not add "non-negotiable" mechanics. The platform should show price and stay out of the negotiation.

**Stale listings destroy trust faster than anything else.** OLX's biggest problem. Indian users have been burned by calling about listings that sold months ago. "Mark as Sold" with automatic prompt after 30 days of no activity is a strong differentiator.

**Data costs matter in Tier 2/3 cities.** Images must be lazy-loaded and compressed. Cloudinary's CDN and auto-format (WebP) are not optional — they are the difference between usable and unusable in low-bandwidth areas.

**UPI and digital payments are normalized.** Users are comfortable with digital transactions but expect them to be instant and low-friction. If a payment feature is ever added (inspection booking, featured listing), UPI is the only acceptable primary method.

**App store ratings influence installation decisions.** Indian users check Play Store ratings before installing an unknown app. Getting to 1000+ ratings early (even via a prompt after successful listing creation or contact) matters for growth.

---

## Sources

- Knowledge base: OLX India, Quikr, Cars24, Spinny, Droom, BikeWale, BikedekHo feature analysis
- Knowledge base: Indian mobile UX behavioral patterns (WhatsApp, Paytm, Ola, Swiggy, Zomato)
- Knowledge base: Vahan/NSDL API for RC verification (documented capability, reliability flagged as LOW confidence)
- Knowledge base: React Native Share API for WhatsApp deep link pattern
- PROJECT.md: Revvbase constraints, out-of-scope decisions, stack choices
- Confidence note: WebSearch was unavailable during this research session. All findings are from training knowledge (cutoff August 2025). Market data for EV adoption share and specific API reliability should be verified before building v2 features.

---

*Feature research for: Revvbase — second-hand 2-wheeler marketplace, India*
*Researched: 2026-05-03*
