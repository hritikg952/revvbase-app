# Pitfalls Research

**Domain:** Second-hand 2-wheeler marketplace — React Native + FastAPI + PostgreSQL + Cloudinary (India)
**Researched:** 2026-05-03
**Confidence:** HIGH (React Native, FastAPI, PostgreSQL, Cloudinary patterns) / HIGH (Indian marketplace domain) / MEDIUM (MSG91-specific limits — verify against current MSG91 dashboard)

---

## Critical Pitfalls

### Pitfall 1: FlatList Re-renders Destroying Listing Screen Performance

**What goes wrong:**
The home screen listing feed renders all cards on every state update because `renderItem` is defined as an inline arrow function. On a mid-range Android (the dominant Indian device tier — Redmi, Realme, Samsung M-series), a list of 20–50 cards with 3–4 images each causes visible jank within seconds of scrolling. The app feels broken before a single sale happens.

**Why it happens:**
React Native's `FlatList` skips re-render optimization when `renderItem` is recreated every render cycle. Developers define `renderItem={({ item }) => <ListingCard ... />}` inline and don't realize every parent state change (search text, filter toggle, pull-to-refresh state) triggers full list re-render. Compounded by images that aren't pre-cached.

**How to avoid:**
- Extract `renderItem` to a stable function outside the component, or wrap in `useCallback` with a stable deps array.
- Wrap `ListingCard` in `React.memo` — compare by `listing.id` and `listing.updated_at` only.
- Set `keyExtractor` to `(item) => item.id.toString()` always — never use index.
- Set `removeClippedSubviews={true}`, `maxToRenderPerBatch={8}`, `windowSize={5}` on any list longer than 20 items.
- Use `expo-image` (or `@shopify/flash-list`) instead of RN's `Image` — `expo-image` has built-in memory cache and blurhash placeholder support that matters for image-heavy feeds.

**Warning signs:**
- JS thread frame drops visible in Flipper/Perf Monitor while scrolling
- `renderItem` function reference changes on every parent render (detectable with `why-did-you-render`)
- First 10 listings load fast, but scrolling past 20 introduces stutter

**Phase to address:**
Listing feed phase (home screen + browse). Must be in the definition of done for the feed, not a post-launch optimization.

---

### Pitfall 2: Image Upload UX Collapse on Slow Indian Mobile Networks

**What goes wrong:**
Listing creation requires uploading 5–10 photos. On a 4G connection that drops to 3G mid-upload (extremely common outside tier-1 cities), uploads stall silently. The seller either force-quits the app (losing all entered data) or gets a timeout error with no indication of which images succeeded. The listing form has no partial-upload recovery.

**Why it happens:**
Developers build happy-path upload — select images, POST to `/listings` with multipart form, show spinner, done. No per-image progress tracking, no retry logic, no local draft persistence. The form is stateless between sessions.

**How to avoid:**
- Upload images to Cloudinary **independently** before form submission, not as part of the final listing POST. Each image upload returns a Cloudinary URL immediately.
- Show per-image upload progress (`0%` → `100%`) with a thumbnail and checkmark per photo.
- Store uploaded Cloudinary URLs in local component state (or AsyncStorage draft) as they complete — form submission only sends already-uploaded URLs.
- The listing creation API endpoint receives `{ ..., photos: ["https://res.cloudinary.com/...", ...] }` — pure strings, no binary upload at final submit.
- On network failure mid-upload, show which images failed with a per-image retry button.

**Warning signs:**
- Upload implemented as a single multipart POST to the FastAPI backend
- No per-image upload state in the form component
- Form resets on background/foreground navigation cycle

**Phase to address:**
Listing creation phase. This is the #1 seller-side trust signal — a broken upload flow prevents any content from entering the marketplace.

---

### Pitfall 3: OTP Bombing — Unprotected SMS Endpoint Costs ₹10,000+

**What goes wrong:**
The `/auth/send-otp` endpoint has no rate limiting. A bot (or a competitor) hammers it with thousands of phone numbers (or the same number repeatedly). MSG91 bills per SMS. At ₹0.20–0.50 per SMS, 50,000 requests = ₹10,000–25,000 overnight. The Railway API goes down under load, users can't log in, and the SMS budget is blown for the month.

**Why it happens:**
Rate limiting feels like an ops concern, so it gets deferred. FastAPI makes it trivially easy to add endpoints without any middleware. MSG91's default account has no spend cap unless explicitly set.

**How to avoid:**
- Add `slowapi` (FastAPI rate limiting library) to `/auth/send-otp` from day one: max 3 requests per phone number per 10 minutes, max 10 per IP per hour.
- Set a **spend cap** in the MSG91 dashboard immediately — ₹500/month hard limit for MVP.
- The OTP endpoint must return `200 OK` even for rate-limited requests to invalid numbers (don't leak whether a number is registered — enumerate prevention).
- Implement token bucket per phone number stored in PostgreSQL (no Redis needed for MVP — use a `otp_requests` table with timestamp check).
- Return a `retry_after` seconds value in the rate-limit response so the frontend can show a countdown timer.

**Warning signs:**
- `/auth/send-otp` has no rate limiting middleware
- MSG91 account has no spend cap configured
- OTP endpoint returns `429` with the phone number echoed back (enumeration leak)

**Phase to address:**
Auth phase — this must be in place before any public URL is accessible.

---

### Pitfall 4: JWT Without Refresh Token Cycle Logs Users Out Constantly

**What goes wrong:**
Access tokens expire (typically 30–60 minutes). Without a refresh token flow, users are silently logged out mid-session. On an Indian marketplace app where buyers browse for 10–20 minutes and then want to contact a seller (future feature) or save a listing, an unexpected logout destroys conversion. Sellers lose partially-filled listing forms.

**Why it happens:**
FastAPI JWT tutorials almost universally show only access tokens. Refresh tokens feel like "phase 2" complexity. The app appears to work fine in development because developers never sit idle for 30 minutes.

**How to avoid:**
- Issue both an access token (15-minute TTL) and a refresh token (30-day TTL) at OTP verification.
- Store refresh token in AsyncStorage (mobile — no `httpOnly` cookie option).
- Axios interceptor on the React Native side catches `401` responses, calls `/auth/refresh`, gets new access token, retries original request transparently.
- Store refresh tokens in a `refresh_tokens` PostgreSQL table with `revoked` boolean — enables logout-all-devices and security token invalidation.
- On app foreground (`AppState` change), pre-emptively refresh if access token expires within 2 minutes.

**Warning signs:**
- Auth returns only `access_token` with no `refresh_token`
- No Axios interceptor for 401 retry
- Users report "logged out for no reason" in early testing

**Phase to address:**
Auth phase. Build the full token cycle in one go — retrofitting refresh tokens after the fact requires changes to frontend auth state management, API client, and backend simultaneously.

---

### Pitfall 5: N+1 Query on Listing Feed Kills DB at 500 Listings

**What goes wrong:**
The listing feed endpoint fetches listings, then for each listing fetches photos, seller info, and vehicle details in separate queries. At 50 listings per page, this is 151 queries per request (1 + 50 + 50 + 50). On Railway's shared PostgreSQL, connection pool exhaustion happens around 200–500 concurrent users. Response time degrades from 150ms to 8 seconds.

**Why it happens:**
SQLAlchemy ORM makes it trivially easy to access `listing.photos` after fetching listings — it lazy-loads silently. FastAPI tutorials show simple `.all()` queries without `joinedload` or `selectinload`. The N+1 is invisible in development with 10 test listings.

**How to avoid:**
- Use `selectinload` (not `joinedload`) for photos and seller on the listing feed query: `options(selectinload(Listing.photos), selectinload(Listing.seller))`.
- Use `joinedload` only for single-row lookups (listing detail page), not for paginated feed queries (it produces a cartesian product with multiple photos).
- Add `EXPLAIN ANALYZE` assertions in tests for critical endpoints — fail the test if query count exceeds a threshold.
- The listing feed API response schema must be designed so the frontend never needs to call `/listings/{id}` per card — all card-display data comes from the feed endpoint.

**Warning signs:**
- SQLAlchemy `echo=True` in dev shows 50+ queries for a single feed page request
- Listing detail data (photos, seller phone) accessed via ORM relationship after `.all()` list query
- Response time doubles when listing count doubles (linear, not constant)

**Phase to address:**
Listing feed phase. Write the query with proper eager loading from the start — the ORM pattern is set in stone early and very painful to refactor across all endpoints.

---

### Pitfall 6: Cloudinary Unsigned Upload from Mobile Leaks API Key

**What goes wrong:**
Developer uses Cloudinary's unsigned upload preset with the API key embedded in the React Native app. The key is extracted from the APK bundle (trivial with `apktool` or `jadx`), and an attacker uses it to upload gigabytes of content to the Cloudinary account, triggering overage charges and polluting the media library.

**Why it happens:**
Cloudinary's quickstart documentation prominently shows direct-upload from the browser/mobile with the cloud name, upload preset, and API key. It works immediately. The security model (signed vs. unsigned) is documented but not emphasized in tutorials.

**How to avoid:**
- Use **signed uploads** for all production uploads: React Native requests a short-lived upload signature from the FastAPI backend (`GET /media/upload-signature`), which the backend generates using the Cloudinary Python SDK with the API secret (never exposed to mobile).
- The mobile app sends the image directly to Cloudinary with the signature — backend never handles binary data.
- Use an **unsigned upload preset** only for development/local testing, never in production builds.
- Set Cloudinary folder restrictions in the upload preset: only allow uploads to `revvbase/listings/` prefix.
- Enable Cloudinary's abuse detection (available on free tier) and set a monthly bandwidth alert.

**Warning signs:**
- Cloudinary cloud name + API key in React Native source or `.env` committed to git
- Upload preset set to "unsigned" in Cloudinary dashboard for production
- No `CLOUDINARY_API_SECRET` on the backend — only the API key

**Phase to address:**
Listing creation phase (image upload). Signed upload architecture must be established before the first real upload — it cannot be patched in later without changing both frontend upload logic and backend.

---

### Pitfall 7: Fake/Duplicate Listings Poisoning the Feed from Day One

**What goes wrong:**
Without friction, bots or bad actors create 50–100 fake listings with stolen photos in the first week of launch. The feed fills with scam listings. Legitimate sellers lose trust, buyers leave, and the core value proposition ("trusted source") collapses before PMF is reached.

**Why it happens:**
Listing creation is too easy — phone OTP is the only gate. A single SIM card can be used to create unlimited listings. No per-user listing limits, no photo originality check, no duplicate detection.

**How to avoid:**
- Enforce a per-user active listing limit (e.g., 5 for MVP) in the API — return `403` with clear message when exceeded.
- Add a soft content moderation flag: listings with suspicious patterns (same photo hash, same price, same description) are auto-flagged for manual review, not published immediately.
- Store image perceptual hashes (pHash) on upload — detect duplicate photos across listings from different users.
- For MVP: listings from new accounts (< 24 hours old) do not appear in the main feed until 1 manual approval — keeps the feed clean during launch period.
- Log the phone number + device fingerprint combination per listing for abuse investigation.

**Warning signs:**
- No `max_active_listings` check in listing creation endpoint
- Listings go live immediately with no review gate
- No image hash stored in the listing photo record

**Phase to address:**
Listing creation phase. The per-user limit is one line of code. The moderation flag is one boolean column. Both must ship with listing creation — retrofitting trust mechanisms after a bad-actor incident requires data migrations and reputational damage control simultaneously.

---

### Pitfall 8: Vehicle Attribute Schema Too Rigid (or Too Loose)

**What goes wrong:**
The vehicle detail schema is either (a) a flat table with 30 nullable columns, half of which don't apply to bicycles, or (b) a free-form `attributes JSONB` column with no validation, so every listing has differently-named keys. Option (a) makes adding EV-specific fields (battery capacity, motor wattage) require migrations. Option (b) makes filtering and sorting impossible without full-table scans.

**Why it happens:**
"We'll figure out the schema later" defers the hard domain modeling. The naive approach (nullable flat table) seems fine for 5 listings in development. JSONB feels flexible and modern.

**How to avoid:**
- Use a **discriminated union pattern**: `listings` table has common fields (price, city, year, odometer, vehicle_type), plus a `vehicle_details` JSONB column that is **validated at the API layer** (Pydantic models per vehicle type: `MotorcycleDetails`, `ScooterDetails`, `EVDetails`, `BicycleDetails`).
- The JSONB column stores structured, validated data — not free-form. FastAPI Pydantic discriminated unions (`vehicle_type` as discriminator) enforce this at the API boundary.
- Index commonly-filtered JSONB fields: `CREATE INDEX ON listings ((vehicle_details->>'make'))`.
- PostGIS extension should be enabled from migration 001 — adds it, even if no spatial queries run yet.
- Future filter fields (engine_cc, battery_kwh) get added as Pydantic fields, not DB columns — zero migration needed until you need DB-level filtering.

**Warning signs:**
- `listings` table has more than 15 nullable columns
- `vehicle_details` JSONB has no Pydantic model validating it before storage
- "Bicycle doesn't have engine_cc" handled with `if vehicle_type == 'bicycle': skip`

**Phase to address:**
Data model / listing creation phase. Schema decisions made here are permanent without painful migrations.

---

### Pitfall 9: Navigation State Lost on Deep-Link or Background Kill

**What goes wrong:**
User is browsing a listing detail page, receives a WhatsApp message, switches apps for 3 minutes, returns to find the app has been killed (common on low-RAM Indian devices with aggressive app killing — MIUI, ColorOS). App restarts to the home screen instead of the listing they were viewing. Shareable listing links (future feature) open to a blank screen.

**Why it happens:**
React Navigation deep linking and state persistence are not configured by default. `expo-router` handles this better but still requires explicit linking config. Developers test on high-RAM simulators where background kill never occurs.

**How to avoid:**
- Configure React Navigation's `linking` prop from day one with path mappings for all screens: `/listing/:id`, `/seller/:id`.
- Implement navigation state persistence using `AsyncStorage` — React Navigation has first-class support via `onStateChange` + `initialState`.
- Test on a Redmi device with "Kill in background" aggressive setting enabled (or emulate with `adb shell am kill`).
- Every screen that shows content from an API must handle the "came from cold start / deep link" case where params exist but no prior navigation state does.

**Warning signs:**
- No `linking` config in Navigation container
- Back button on listing detail has no defined behavior for cold-start entry
- Testing only on iOS Simulator or high-end Android

**Phase to address:**
Navigation/routing phase (early). Retrofitting deep linking after all screens are built requires touching every screen's param handling.

---

### Pitfall 10: Scope Creep: In-App Chat Added "Just for MVP"

**What goes wrong:**
Stakeholder (or developer) argues that "without contact functionality, buyers can't reach sellers, so the app has zero value." In-app chat gets added to MVP scope. It requires: WebSocket infrastructure, message persistence, push notifications, read receipts, spam filtering, and a completely separate UI surface. MVP ships 3 months late, half-finished, and the core listing experience is deprioritized.

**Why it happens:**
The "communication gap" objection is real and sounds logical. But it mistakes the MVP goal (validate that people will list and browse 2-wheelers on this specific platform) for a complete product.

**How to avoid:**
- The interim solution is explicit in the architecture: listing detail page shows the seller's phone number for WhatsApp/call. This is the exact trust pattern used by OLX India successfully for years.
- The architecture must not block adding in-app messaging later (the `users` table has a phone number; a `conversations` table can be added without touching existing tables).
- When the "just add chat" argument comes up, the counter-question is: "Do we have 100 listings yet? If not, chat has no users." Validate the listing + browse loop first.
- Lock the MVP scope in `PROJECT.md` and treat additions as a separate milestone decision.

**Warning signs:**
- "Can we just add a simple message button?" appearing in planning discussion
- WebSocket library being evaluated before listing creation is working
- Push notification infrastructure added before there are users to notify

**Phase to address:**
Every phase. Scope discipline is a process control, not a technical decision. Enforce at milestone planning, not in code review.

---

### Pitfall 11: Missing Indexes on Listing Feed Query

**What goes wrong:**
The listing feed query filters by `city` and `is_active = true`, orders by `created_at DESC`. Without indexes, PostgreSQL does a full sequential scan. At 10,000 listings this takes 200ms. At 100,000 listings it takes 2–8 seconds. Railway's shared DB CPU spikes and all queries slow.

**Why it happens:**
PostgreSQL works perfectly without explicit indexes for small datasets. The problem is invisible in development and early beta. By the time it's noticed, the production DB has users and a migration must run live.

**How to avoid:**
- In the initial migration (alongside table creation), add:
  ```sql
  CREATE INDEX idx_listings_city_active ON listings (city, is_active);
  CREATE INDEX idx_listings_created_at ON listings (created_at DESC);
  CREATE INDEX idx_listings_seller_id ON listings (seller_id);
  CREATE INDEX idx_listings_vehicle_type ON listings (vehicle_type);
  ```
- For the JSONB vehicle_details column, add expression indexes for fields that will be filtered in v2: `CREATE INDEX idx_listings_make ON listings ((vehicle_details->>'make'))`.
- Run `EXPLAIN ANALYZE` on the three most-used queries (feed, search, seller listings) before the first deployment. Assert sequential scans are absent on indexed columns.

**Warning signs:**
- Migrations create tables but no indexes
- `EXPLAIN ANALYZE` shows `Seq Scan` on `listings` table with filter on `city` or `is_active`
- Feed response time is acceptable at 100 listings but not benchmarked

**Phase to address:**
Database / listing feed phase. Indexes belong in the same migration as the table — not as a follow-up "performance" ticket.

---

### Pitfall 12: Cloudinary Transformation Cost Surprise

**What goes wrong:**
The listing detail page requests images at different sizes: thumbnail (200×150), card (400×300), full-screen (800×600). Each unique `w_`, `h_`, `c_` transformation URL is generated and served. Cloudinary's free tier includes 25 transformation credits/month; each unique transformation on a unique image consumes a credit. At 500 listings with 5 photos each, 3 sizes = 7,500 transformations in the first month. Free tier is exhausted in week one.

**Why it happens:**
Cloudinary's transformation URL syntax is effortlessly powerful. It's easy to add `w_400,h_300,c_fill` parameters anywhere without tracking the credit budget.

**How to avoid:**
- Define a **fixed set of named transformations** in the Cloudinary dashboard (e.g., `listing_card`, `listing_thumb`, `listing_full`) and use named transformation URLs only — Cloudinary caches these aggressively and does not re-bill on cache hit.
- On upload, eagerly generate the 3 named transformations immediately (Cloudinary "eager" upload option) — subsequent requests serve from cache, consuming zero additional credits.
- Store the base Cloudinary public ID in the database, not the fully-transformed URL — generate URLs in the API response layer using the SDK.
- Monitor transformation usage in the Cloudinary dashboard weekly during the first month.

**Warning signs:**
- Transformation parameters are constructed dynamically per component in the frontend
- Different image sizes requested by constructing different URL strings on the fly
- No named transformations configured in Cloudinary dashboard

**Phase to address:**
Listing creation phase (image upload architecture). The base URL storage pattern and named transformation strategy must be established before any images are uploaded to production.

---

## Technical Debt Patterns

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Store full Cloudinary URL in DB instead of public_id | Simpler API responses | Cannot change CDN domain, cannot regenerate transformations, vendor lock-in at data layer | Never — store public_id always |
| Skip refresh token, use 7-day access token | Simpler auth flow | Token cannot be revoked if device stolen; security risk for marketplace (financial transactions incoming) | Never in production |
| Inline `renderItem` in FlatList | Faster to write | Entire list re-renders on any state change; jank on budget devices | Never — costs 2 lines to fix |
| No per-user listing limit | Simpler creation flow | Feed poisoned by single bad actor with one SIM card | Never — add limit from day 1 |
| Unsigned Cloudinary upload preset | No backend signature endpoint needed | API key leaked via APK extraction | Development only |
| JSONB free-form for vehicle attributes | No schema to design | Filtering impossible; different keys per listing | Never — validate at API layer |
| No eager loading on ORM queries | Simpler query code | N+1 queries at 50+ listings; DB connection exhaustion | Never — use selectinload from day 1 |
| Ship without navigation deep linking | Faster initial development | Shareable links broken; state lost on background kill | Never — configure linking with navigation setup |

---

## Integration Gotchas

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| MSG91 | Send OTP without verifying the number is a valid 10-digit Indian mobile number first | Validate `^[6-9]\d{9}$` before calling MSG91 API — saves SMS credits and prevents number-not-found errors |
| MSG91 | Use the same template for all OTP messages | Indian DLT regulations require pre-approved SMS templates — use MSG91's DLT template registration; unregistered templates get blocked by carriers |
| MSG91 | Assume OTP delivery is instant | MSG91 can have 5–30s delays during peak hours (evening 7–10pm IST); set OTP expiry to 10 minutes, not 2 |
| Cloudinary | Store API secret in React Native `.env` | API secret must only exist on the backend; frontend only receives upload signatures |
| Cloudinary | Use `fetch` to upload directly to Cloudinary from RN | Use `expo-image-picker` result URI with `FormData` — direct fetch to Cloudinary works but loses progress events; use XMLHttpRequest for upload progress |
| Cloudinary | Delete images when listing is deleted | On listing delete, orphaned images accumulate; implement a soft-delete pattern and a cleanup job (even a manual monthly one for MVP) |
| FastAPI | Return `500` for validation errors | FastAPI's default Pydantic validation returns `422 Unprocessable Entity` — frontend must handle 422, not just 400 and 500 |
| FastAPI + Railway | No connection pool configuration | SQLAlchemy default pool is 5 connections; Railway's PostgreSQL plan has a connection limit; set `pool_size=3, max_overflow=7` explicitly |
| PostgreSQL + PostGIS | Enable PostGIS after data exists | PostGIS is a PostgreSQL extension — `CREATE EXTENSION postgis` must be in migration 001, not added later when spatial queries are needed; Railway supports it |

---

## Performance Traps

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| N+1 ORM queries on listing feed | Response time grows linearly with page size; `echo=True` shows 50+ queries per request | `selectinload` for collections, `joinedload` for single related rows; never access ORM relationships after paginated `.all()` | ~50 listings in the feed |
| FlatList without `React.memo` + stable `renderItem` | Scroll jank on mid-range Android; JS thread frame drops | Memo + useCallback on renderItem; `removeClippedSubviews` | ~20 image-heavy cards |
| Cloudinary on-the-fly transformations | Transformation credit exhaustion; slow first-load on uncached transforms | Named transformations + eager generation on upload | ~500 listings × 5 photos × 3 sizes = 7,500 transforms |
| Synchronous image resizing in FastAPI | Upload endpoint blocks; Railway container CPU maxes out | Delegate all transforms to Cloudinary — FastAPI never touches image binary | Any significant upload volume |
| Full table scan on listing feed | Feed endpoint p99 latency spikes; DB CPU high | Composite index on `(city, is_active)`, index on `created_at DESC` | ~10,000 listings |
| No pagination on listing feed | Entire listings table returned; OOM on Railway container | Cursor-based pagination from day 1 (`?after_id=` pattern, not `?page=`) | ~500 listings |
| React Native image memory not released | App crashes after browsing 30+ listings; `OutOfMemoryError` on Android | Use `expo-image` with `contentFit` and explicit `recyclingKey`; avoid `Image` from `react-native` for lists | Mid-range devices with 2GB RAM |

---

## Security Mistakes

| Mistake | Risk | Prevention |
|---------|------|------------|
| No rate limiting on `/auth/send-otp` | Attacker spends ₹10,000+ in SMS credits overnight; DoS via MSG91 quota exhaustion | `slowapi` rate limiter: 3/phone/10min, 10/IP/hour; MSG91 spend cap |
| Cloudinary API secret in React Native app | Full account takeover via APK extraction; attacker uploads/deletes all media | Signed upload only in production; secret never leaves backend |
| JWT access token without revocation | Stolen phone retains permanent API access | Refresh token table with `revoked` flag; `/auth/logout` invalidates refresh token |
| Listing edit/delete without ownership check | Any authenticated user can delete any listing | `WHERE seller_id = current_user.id` in all mutating queries; never trust client-supplied `seller_id` |
| Returning raw PostgreSQL error messages to client | Exposes table structure, column names, DB version | Global FastAPI exception handler wraps all DB errors in generic `500` response |
| No image content-type validation before Cloudinary upload | User uploads `.exe` or oversized file under image MIME type | Validate MIME type and file size on the backend signature endpoint before issuing upload signature |
| Phone number enumeration via OTP endpoint | Attacker discovers which phone numbers are registered | Always return `200 OK` with identical response body regardless of whether number exists or is rate-limited |

---

## UX Pitfalls

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| Forcing GPS location permission to browse listings | Indian users (trained by scammy apps) deny location permissions; browse feed shows nothing | City-based location as text field; location permission only requested for "find near me" (v2 feature); never block browsing on GPS |
| OTP input as plain text field | Users on feature phones or older Android struggle with autofill; OTP not auto-filled from SMS | Use `OTPInput` component with `textContentType="oneTimeCode"` (iOS) and `autoComplete="sms-otp"` (Android); 6-box input UI is expected pattern |
| No loading skeleton on listing feed | Feed appears broken during initial load; users close the app | Skeleton cards (3–4) during loading; never show an empty white screen |
| Requiring account creation before browsing | 60–70% of Indian users drop off at forced registration walls | Browse-first: unauthenticated users can view listings; auth only required for creating a listing or contacting seller |
| Image gallery with pinch-zoom unavailable | Buyers cannot inspect vehicle condition closely; trust decreases | Full-screen image viewer with pinch-zoom on listing detail; this is table stakes for a vehicle marketplace |
| Form auto-capitalization on vehicle make/model fields | "honda" stored as-is; inconsistent data makes future filtering impossible | `autoCapitalize="words"` on make/model fields; normalize casing in the Pydantic model before storage |
| No offline / poor-connection feedback | User submits listing form, nothing happens; submits again, duplicate created | Disable submit button after first tap; show network-aware error ("Check connection and retry") for upload failures |

---

## "Looks Done But Isn't" Checklist

- [ ] **OTP Auth:** Looks done after OTP sends and token returns — verify rate limiting is active, refresh token cycle works, and logout invalidates the token server-side.
- [ ] **Listing Creation:** Looks done when form submits and listing appears — verify per-user listing limit enforced, images uploaded via signed URL (not unsigned preset), and new-account moderation flag is set.
- [ ] **Listing Feed:** Looks done when cards render — verify `EXPLAIN ANALYZE` shows no sequential scans, `React.memo` is on card component, and response time is stable from 10 to 500 listings.
- [ ] **Image Upload:** Looks done when upload succeeds on WiFi — verify upload recovers gracefully on 3G drop, per-image progress is shown, and Cloudinary public_id (not full URL) is stored in DB.
- [ ] **Listing Detail:** Looks done when data displays — verify pinch-zoom works on image gallery, cold-start deep link navigates correctly, and unauthenticated users can view the page.
- [ ] **Edit/Delete Listing:** Looks done when owner can edit — verify a different authenticated user cannot edit or delete via direct API call with a valid JWT.
- [ ] **Database:** Looks done when queries return data — verify all indexes exist (`\d+ listings` in psql), PostGIS extension is enabled, and connection pool is sized for Railway limits.
- [ ] **Cloudinary:** Looks done when images appear — verify named transformations are configured, eager generation is enabled on upload, and no API secret exists in the React Native app bundle.

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| OTP bombing already happened | MEDIUM | Immediately set MSG91 spend cap; add rate limiting middleware; rotate MSG91 API key; review Railway logs for IP patterns; add IP block list |
| Unsigned Cloudinary key leaked | HIGH | Immediately rotate API key in Cloudinary dashboard; audit upload history for unauthorized content; switch to signed upload architecture before re-deploying; purge old key from git history |
| N+1 queries at scale | MEDIUM | Add `selectinload` to affected endpoints; deploy; no data migration needed — purely query-layer change |
| No indexes, slow feed | LOW | Write and deploy Alembic migration adding indexes; PostgreSQL creates indexes concurrently with `CONCURRENTLY` flag — no downtime |
| Full Cloudinary transform URL stored in DB | HIGH | Data migration to extract public_id from stored URLs; update all API response serializers; test all image display surfaces; risk of orphaned or broken URLs during migration |
| Fake listings in feed | MEDIUM | Add per-user limit enforcement; manually review and remove existing fakes; add `flagged` column to listings; notify affected users |
| JWT tokens not revocable | MEDIUM | Add `refresh_tokens` table; force all users to re-login (invalidate existing tokens by changing JWT secret or adding `jti` claim blacklist) |

---

## Pitfall-to-Phase Mapping

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| OTP bombing / rate limiting | Auth phase | `slowapi` middleware visible in code; MSG91 spend cap set; `ab` test shows 429 after threshold |
| JWT without refresh token | Auth phase | `/auth/refresh` endpoint exists; Axios interceptor retries on 401; `refresh_tokens` table in DB schema |
| Phone number enumeration | Auth phase | All OTP responses return identical 200 body; no timing difference between registered/unregistered numbers |
| Unsigned Cloudinary upload | Listing creation phase | No Cloudinary API key in RN source; `/media/upload-signature` endpoint exists on backend |
| Image upload UX on slow networks | Listing creation phase | Upload tested on throttled 3G (Chrome DevTools or real device); per-image progress visible |
| N+1 ORM queries | Listing feed phase | `echo=True` shows ≤3 queries for feed endpoint; `selectinload` in query |
| Missing DB indexes | Listing feed phase / DB schema | `\d+ listings` shows indexes on city, is_active, created_at; `EXPLAIN ANALYZE` has no seq scans |
| FlatList re-render jank | Listing feed phase | `React.memo` on card; `useCallback` on `renderItem`; Flipper shows stable JS frame rate |
| Cloudinary transformation cost | Listing creation phase | Named transformations in Cloudinary dashboard; eager option on upload; no dynamic transform URLs in frontend |
| Vehicle schema too rigid/loose | Data model phase (first migration) | Pydantic discriminated union per vehicle type; JSONB validated before storage |
| Fake listings / no limit | Listing creation phase | `max_active_listings` check in create endpoint; new-account flag in listing model |
| Navigation state / deep linking | Navigation setup phase | Cold-start to `/listing/:id` URL renders correctly; state persists through background kill |
| Scope creep (chat, etc.) | Every phase (planning discipline) | Out-of-scope features documented in PROJECT.md; no WebSocket library in dependencies |
| GPS forced for browsing | Listing feed / browse phase | Unauthenticated browse works with no location permission; city filter is text-based |
| Listing ownership not checked | Listing management phase | Integration test: JWT of user B cannot edit/delete listing owned by user A |
| PostGIS not enabled early | Initial migration | `\dx` in psql shows `postgis` extension; spatial query can be run without migration |

---

## Sources

- React Native FlatList optimization: React Native official docs (Performance section), `@shopify/flash-list` rationale documentation
- Cloudinary signed upload security: Cloudinary official docs — "Upload API Reference > Authentication"
- MSG91 DLT compliance: TRAI DLT regulations for commercial SMS in India (mandatory since 2021)
- FastAPI SQLAlchemy N+1: SQLAlchemy docs — "Relationship Loading Techniques"; FastAPI SQL tutorial
- PostgreSQL index strategy: PostgreSQL official docs — "Indexes"; "EXPLAIN" documentation
- Indian mobile marketplace patterns: OLX India, Spinny, Cars24 — observed UX patterns (browse-first, phone-number identity, WhatsApp handoff)
- JWT refresh token pattern: RFC 6749 OAuth 2.0 token refresh; OWASP Mobile Security Testing Guide
- Railway PostgreSQL constraints: Railway documentation — PostgreSQL connection limits per plan tier

---
*Pitfalls research for: Revvbase — second-hand 2-wheeler marketplace India*
*Researched: 2026-05-03*
