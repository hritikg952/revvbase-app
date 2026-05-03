# Architecture Research

**Domain:** Mobile-first second-hand vehicle marketplace (2-wheelers, India)
**Researched:** 2026-05-03
**Confidence:** HIGH for structural patterns, MEDIUM for Cloudinary-specific mobile flow details

---

## Standard Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                        CLIENT LAYER                                  │
│                                                                      │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │               React Native App (New Architecture)             │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌────────────┐   │   │
│  │  │  Screens │  │  State   │  │   API    │  │   Image    │   │   │
│  │  │ /Browse  │  │  Store   │  │  Client  │  │  Picker /  │   │   │
│  │  │ /Detail  │  │ (Zustand)│  │ (Axios)  │  │  Uploader  │   │   │
│  │  │ /Create  │  └──────────┘  └──────────┘  └────────────┘   │   │
│  │  │ /Profile │                                                  │   │
│  │  └──────────┘                                                  │   │
│  └──────────────────────────────────────────────────────────────┘   │
└───────────────────────┬─────────────────────────┬───────────────────┘
                        │ HTTPS/JSON               │ HTTPS (direct upload)
                        ▼                          ▼
┌───────────────────────────────┐    ┌─────────────────────────────────┐
│         API LAYER              │    │       EXTERNAL SERVICES          │
│                               │    │                                  │
│  ┌───────────────────────┐    │    │  ┌──────────────────────────┐   │
│  │       FastAPI          │    │    │  │       Cloudinary          │   │
│  │  ┌─────────────────┐  │    │    │  │  (CDN + Transform + Store)│   │
│  │  │  /auth router   │  │    │    │  └──────────────────────────┘   │
│  │  │  /listings      │  │    │    │                                  │
│  │  │  /users         │  │    │    │  ┌──────────────────────────┐   │
│  │  └─────────────────┘  │    │    │  │         MSG91             │   │
│  │  ┌─────────────────┐  │    │    │  │    (OTP SMS delivery)     │   │
│  │  │  Auth middleware │  │    │    │  └──────────────────────────┘   │
│  │  │  (JWT verify)    │  │    │    │                                  │
│  │  └─────────────────┘  │    │    └─────────────────────────────────┘
│  └───────────┬───────────┘    │              ▲
│              │                │              │ sign request (server)
│              │                │              │ or unsigned preset
└──────────────┼────────────────┘              │
               ▼                               │
┌──────────────────────────────────────────────┘
│         DATA LAYER (Railway)
│
│  ┌───────────────────────────────────────────┐
│  │              PostgreSQL                    │
│  │  ┌──────────┐  ┌───────────┐  ┌────────┐ │
│  │  │  users   │  │ listings  │  │ images │ │
│  │  └──────────┘  └───────────┘  └────────┘ │
│  └───────────────────────────────────────────┘
└──────────────────────────────────────────────
```

### Component Responsibilities

| Component | Responsibility | Implementation |
|-----------|----------------|----------------|
| React Native App | All UI, local state, navigation, image picking | Expo + React Navigation v6 |
| API Client (in-app) | HTTP requests, JWT attachment, error normalization | Axios + interceptors |
| FastAPI | Business logic, auth, data validation, DB access | Python, Pydantic v2 models |
| Auth middleware | JWT verification on protected routes | FastAPI `Depends()` injection |
| PostgreSQL | Persistent data: users, listings, image metadata | PostGIS-enabled from day 1 |
| Cloudinary | Image storage, CDN delivery, transforms (resize/WebP) | SDK or direct REST upload |
| MSG91 | OTP SMS delivery to Indian phone numbers | REST API call from FastAPI |

---

## Key Data Flows

### Flow 1: OTP Authentication

```
[App] User enters phone number
    ↓
[App → FastAPI POST /auth/otp/request]
    body: { phone: "+91XXXXXXXXXX" }
    ↓
[FastAPI] Generates 6-digit OTP, stores in DB (otp_sessions table)
    with expiry (5 min), hashed
    ↓
[FastAPI → MSG91 REST API] Send SMS with OTP
    ↓
[FastAPI → App] 200 OK, { session_id: "..." }
    ↓
[App] User enters OTP
    ↓
[App → FastAPI POST /auth/otp/verify]
    body: { session_id, otp }
    ↓
[FastAPI] Validates OTP hash + expiry, marks session used
    ↓
[FastAPI] Upserts user record (create if new, fetch if existing)
    ↓
[FastAPI → App] { access_token (JWT, 7d), user: { id, phone, ... } }
    ↓
[App] Stores JWT in SecureStore, sets auth state
```

Key decisions:
- OTP sessions are server-side (never trust client for OTP state)
- JWT is stateless — no session table needed for authenticated requests
- Phone number is the only identity primitive for MVP
- OTP expiry: 5 minutes; rate-limit: 1 OTP per 60 seconds per phone

---

### Flow 2: Create Listing (with multiple images)

This is the most architecturally sensitive flow. Two viable patterns exist:

**Pattern A — Server-mediated upload (AVOID for MVP)**
```
App → FastAPI (multipart) → Cloudinary → FastAPI stores URL → App
```
Problem: Binary data transits Railway server, increasing bandwidth cost and latency. Server becomes a bottleneck for large images.

**Pattern B — Client-direct upload with server-issued signature (RECOMMENDED)**
```
[App] Seller fills form, selects photos (max 8)
    ↓
[App → FastAPI POST /listings/upload-signature]
    header: Authorization: Bearer <JWT>
    body: { file_count: 3 }
    ↓
[FastAPI] Generates Cloudinary signed upload params
    (timestamp, signature, upload_preset, folder: "listings/{user_id}")
    Returns: { upload_url, params[] } — one set per image
    ↓
[App] Uploads each image directly to Cloudinary
    using signed params (PUT/POST to Cloudinary upload endpoint)
    Returns: { public_id, secure_url, width, height } per image
    ↓
[App → FastAPI POST /listings]
    header: Authorization: Bearer <JWT>
    body: { listing fields... , images: [{ public_id, url, order }] }
    ↓
[FastAPI] Validates ownership (JWT user_id), persists listing + image records
    ↓
[FastAPI → App] 201 Created, { listing_id, ... }
```

Why Pattern B:
- Railway bandwidth is metered; images can be 2-10 MB each
- Cloudinary's upload endpoint is globally distributed (faster from India)
- Server only handles metadata, not binary payloads
- Cloudinary's signed upload prevents unauthorized uploads to your account
- Confidence: HIGH — this is the documented Cloudinary pattern for mobile

**Upload UX consideration:** Upload images one by one in the background while user fills form fields. Show per-image progress. Don't block form submission on upload; collect `public_id` references as images complete.

---

### Flow 3: Browse Listings (Feed)

```
[App] Home screen mounts / user scrolls to bottom
    ↓
[App → FastAPI GET /listings?page=1&limit=20&city=Mumbai&type=motorcycle]
    ↓
[FastAPI] Builds query with filters, executes keyset or offset pagination
    ↓
[PostgreSQL] Returns listing rows with JOIN on images (first image only for card)
    ↓
[FastAPI] Serializes to ListingCard schema (minimal fields for list view)
    ↓
[App] Renders FlatList cards; images delivered via Cloudinary CDN URL
    (URL includes transform params: w_400,h_300,c_fill,f_webp)
```

Pagination strategy — use **cursor/keyset pagination** over offset:
- Offset pagination (`LIMIT 20 OFFSET 200`) degrades at scale and gives duplicate/missing items when listings are added mid-browse
- Keyset: `WHERE (created_at, id) < ($last_created_at, $last_id) ORDER BY created_at DESC, id DESC LIMIT 20`
- Return `{ items[], next_cursor }` — cursor is an opaque base64-encoded `{created_at, id}` pair

---

### Flow 4: View Listing Detail

```
[App] User taps listing card
    ↓
[App → FastAPI GET /listings/{listing_id}]
    ↓
[FastAPI] Fetches full listing with all images, seller phone (masked for MVP)
    ↓
[App] Renders detail screen; image gallery uses all Cloudinary URLs
    (transform: w_800,h_600,c_fill,f_webp for full-view quality)
```

---

## Recommended Project Structure

### FastAPI Backend

```
app/
├── main.py                 # FastAPI app init, router registration, CORS
├── config.py               # Settings (pydantic-settings, reads .env)
├── database.py             # SQLAlchemy engine, session factory, Base
│
├── routers/                # One file per resource domain
│   ├── auth.py             # POST /auth/otp/request, POST /auth/otp/verify
│   ├── listings.py         # GET /listings, POST /listings, GET /listings/{id},
│   │                       # PUT /listings/{id}, DELETE /listings/{id}
│   │                       # POST /listings/upload-signature
│   └── users.py            # GET /users/me, PUT /users/me
│
├── models/                 # SQLAlchemy ORM models (DB table definitions)
│   ├── user.py
│   ├── listing.py
│   ├── listing_image.py
│   └── otp_session.py
│
├── schemas/                # Pydantic request/response schemas
│   ├── auth.py             # OTPRequest, OTPVerify, TokenResponse
│   ├── listing.py          # ListingCreate, ListingUpdate, ListingCard, ListingDetail
│   └── user.py             # UserMe, UserUpdate
│
├── services/               # Business logic, external API calls
│   ├── auth_service.py     # OTP generate/verify, JWT sign/decode
│   ├── listing_service.py  # Listing CRUD, query building, pagination
│   ├── cloudinary_service.py  # Signed upload param generation
│   └── msg91_service.py    # OTP SMS dispatch
│
├── dependencies.py         # FastAPI Depends() — get_db, get_current_user
└── utils/
    ├── security.py         # OTP hashing, JWT helpers
    └── pagination.py       # Cursor encode/decode helpers
```

**Rationale:**
- `routers/` = HTTP layer only (route registration, request parsing, response shaping)
- `services/` = business logic lives here, not in routers
- `models/` vs `schemas/` separation is critical — ORM models are NOT Pydantic schemas; conflating them causes serialization bugs
- Keep `services/` ignorant of HTTP concerns — makes unit testing possible without test client overhead

### React Native App

```
src/
├── app/                    # Expo Router file-based navigation
│   ├── (auth)/             # Unauthenticated screens
│   │   ├── phone.tsx       # Phone entry
│   │   └── otp.tsx         # OTP verification
│   ├── (tabs)/             # Bottom tab navigator
│   │   ├── index.tsx       # Home / Browse feed
│   │   ├── sell.tsx        # Create listing entry point
│   │   └── profile.tsx     # User profile / my listings
│   ├── listing/
│   │   ├── [id].tsx        # Listing detail
│   │   └── create.tsx      # Full create listing form
│   └── _layout.tsx         # Root layout, auth guard
│
├── components/
│   ├── listing/
│   │   ├── ListingCard.tsx
│   │   ├── ListingGallery.tsx
│   │   └── ListingForm.tsx
│   ├── ui/                 # Design system primitives
│   │   ├── Button.tsx
│   │   ├── Input.tsx
│   │   └── Typography.tsx
│   └── shared/
│       └── SafeImage.tsx   # Cloudinary URL + fallback
│
├── store/                  # Zustand state slices
│   ├── authStore.ts        # user, token, isAuthenticated
│   └── listingsStore.ts    # feed cache, pagination cursor
│
├── api/                    # API client layer
│   ├── client.ts           # Axios instance, JWT interceptor, 401 handler
│   ├── auth.ts             # Auth endpoint functions
│   ├── listings.ts         # Listing endpoint functions
│   └── types.ts            # Shared TypeScript types matching API schemas
│
├── hooks/
│   ├── useListings.ts      # Feed fetching + infinite scroll logic
│   └── useUpload.ts        # Cloudinary direct upload hook
│
└── utils/
    ├── cloudinary.ts       # URL transform builder helpers
    └── storage.ts          # SecureStore JWT wrapper
```

---

## PostgreSQL Schema Patterns

### Core Tables

```sql
-- Users: phone is the only identity primitive
CREATE TABLE users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) UNIQUE NOT NULL,  -- E.164 format: +91XXXXXXXXXX
    name        VARCHAR(100),
    city        VARCHAR(100),
    created_at  TIMESTAMPTZ DEFAULT now(),
    updated_at  TIMESTAMPTZ DEFAULT now()
);

-- OTP sessions: server-side OTP state
CREATE TABLE otp_sessions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone       VARCHAR(15) NOT NULL,
    otp_hash    VARCHAR(255) NOT NULL,        -- bcrypt hash of 6-digit OTP
    expires_at  TIMESTAMPTZ NOT NULL,
    used        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_otp_sessions_phone ON otp_sessions(phone);

-- Listings: core table. JSONB for vehicle-type-specific attributes
CREATE TABLE listings (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    seller_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Common fields (all vehicle types)
    vehicle_type    VARCHAR(30) NOT NULL,     -- motorcycle|scooter|ev|bicycle
    make            VARCHAR(100) NOT NULL,
    model           VARCHAR(100) NOT NULL,
    year            SMALLINT NOT NULL,
    price           INTEGER NOT NULL,         -- INR, no decimals
    city            VARCHAR(100) NOT NULL,
    state           VARCHAR(100),
    odometer_km     INTEGER,                  -- NULL for bicycles
    color           VARCHAR(50),
    description     TEXT,

    -- Ownership / condition
    owners_count    SMALLINT DEFAULT 1,
    insurance_valid_until DATE,

    -- Fuel / powertrain (nullable for bicycles/EVs)
    fuel_type       VARCHAR(20),              -- petrol|diesel|electric|cng|null

    -- Vehicle-type-specific attributes (flexible, no EAV overhead)
    attributes      JSONB DEFAULT '{}',       -- e.g. {"battery_kwh": 3.0, "range_km": 100}

    -- Location (PostGIS-ready)
    location        GEOGRAPHY(POINT, 4326),   -- NULL until PostGIS feature enabled

    -- Status
    status          VARCHAR(20) DEFAULT 'active', -- active|sold|deleted
    is_featured     BOOLEAN DEFAULT FALSE,

    created_at      TIMESTAMPTZ DEFAULT now(),
    updated_at      TIMESTAMPTZ DEFAULT now()
);

-- Indexes for common query patterns
CREATE INDEX idx_listings_vehicle_type ON listings(vehicle_type);
CREATE INDEX idx_listings_city ON listings(city);
CREATE INDEX idx_listings_price ON listings(price);
CREATE INDEX idx_listings_status ON listings(status);
CREATE INDEX idx_listings_created_at ON listings(created_at DESC);
CREATE INDEX idx_listings_seller_id ON listings(seller_id);
-- Composite for feed query (status + sort)
CREATE INDEX idx_listings_feed ON listings(status, created_at DESC) WHERE status = 'active';
-- GIN index for JSONB attribute search (future)
CREATE INDEX idx_listings_attributes ON listings USING GIN(attributes);

-- Listing images: ordered, with Cloudinary references
CREATE TABLE listing_images (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    listing_id  UUID NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
    public_id   VARCHAR(255) NOT NULL,        -- Cloudinary public_id (used for transforms)
    url         TEXT NOT NULL,               -- Cloudinary secure_url (canonical)
    width       INTEGER,
    height      INTEGER,
    sort_order  SMALLINT DEFAULT 0,          -- 0 = cover photo
    created_at  TIMESTAMPTZ DEFAULT now()
);
CREATE INDEX idx_listing_images_listing_id ON listing_images(listing_id);
```

**JSONB vs EAV for vehicle attributes:**
Use JSONB (as above), not EAV. EAV (entity-attribute-value) tables require multi-JOIN queries that are painful to write and optimize. JSONB stores arbitrary vehicle-type-specific fields cleanly, is queryable with GIN indexes, and requires no schema migration when adding new EV battery fields or bicycle gear count fields. Confidence: HIGH — this is the established PostgreSQL pattern for flexible product attributes.

---

## API Design Patterns

### Listing Endpoints

```
GET  /listings                     Browse feed (paginated, filtered)
GET  /listings/{id}                Full detail
POST /listings                     Create (auth required)
PUT  /listings/{id}                Update (auth + ownership required)
DELETE /listings/{id}              Soft-delete → status='deleted' (auth + ownership)
POST /listings/upload-signature    Get Cloudinary signed upload params (auth required)

GET  /users/me                     Current user profile
PUT  /users/me                     Update profile

POST /auth/otp/request             Trigger OTP SMS
POST /auth/otp/verify              Verify OTP, return JWT
```

### Query Parameters for Browse

```
GET /listings?
  type=motorcycle          # vehicle_type filter
  city=Mumbai              # city filter
  min_price=50000          # price range
  max_price=200000
  make=Honda               # make filter
  page_cursor=<opaque>     # keyset pagination cursor
  limit=20                 # default 20, max 50
  sort=newest              # newest (default) | price_asc | price_desc
```

### Response Envelope

Use a consistent envelope for all list responses:

```json
{
  "data": [...],
  "meta": {
    "total": null,           // omit for keyset pagination (expensive COUNT)
    "next_cursor": "eyJj...",
    "has_more": true
  }
}
```

Single resources return the object directly (no envelope needed for GET /listings/{id}).

---

## Architectural Patterns

### Pattern 1: Dependency Injection via FastAPI Depends()

**What:** Route handlers declare dependencies (DB session, current user) as function parameters decorated with `Depends()`. FastAPI resolves them before calling the handler.

**When to use:** Always. This is FastAPI's idiomatic approach.

**Trade-offs:** Slightly unfamiliar initially, but eliminates global state and makes testing trivial (override dependencies in tests).

```python
# dependencies.py
async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    payload = decode_jwt(token)
    user = await db.get(User, payload["sub"])
    if not user:
        raise HTTPException(401)
    return user

# listings.py router
@router.post("/listings")
async def create_listing(
    body: ListingCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    return await listing_service.create(db, current_user.id, body)
```

### Pattern 2: Repository / Service Separation

**What:** Routers handle HTTP. Services handle business logic. Models handle DB queries. Never let HTTP concerns bleed into services.

**When to use:** Always, even on small projects. A service that doesn't import `Request` or `Response` is trivially testable.

**Trade-offs:** More files, cleaner tests. Worth it from day one.

### Pattern 3: Cloudinary URL Transform Builder

**What:** Store only the `public_id` in the DB. Build display URLs at render time by appending Cloudinary transform strings.

**When to use:** Always with Cloudinary. Never store the full URL with transforms baked in.

```typescript
// utils/cloudinary.ts
const CLOUD_NAME = process.env.EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME;

export function listingCardUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_400,h_300,c_fill,f_webp,q_auto/${publicId}`;
}

export function listingDetailUrl(publicId: string) {
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/w_800,h_600,c_fill,f_webp,q_auto/${publicId}`;
}
```

This allows transform parameters to change without DB migrations.

---

## Anti-Patterns

### Anti-Pattern 1: Sending Images Through the Server

**What people do:** Accept multipart file uploads in FastAPI, forward to Cloudinary, return the URL.

**Why it's wrong:** Every image (avg 3-5 MB) transits the Railway server. Railway's free/starter tier has bandwidth caps. 100 listings × 5 images × 4 MB = 2 GB of unnecessary relay traffic. Also adds latency: phone → Railway → Cloudinary instead of phone → Cloudinary directly.

**Do this instead:** Use Cloudinary's signed direct upload (Pattern B above). Server only signs the request; client uploads directly.

### Anti-Pattern 2: Storing Full Cloudinary URLs in the DB

**What people do:** Store `https://res.cloudinary.com/myapp/image/upload/w_400,h_300/v1234/abc.jpg` in the `url` column.

**Why it's wrong:** Transforms are baked in. When you want a different size or format, you must update every row. You also lose the canonical `public_id` needed to delete or re-transform images.

**Do this instead:** Store only `public_id` (e.g., `listings/user_abc/img_xyz`). Build URLs in `utils/cloudinary.ts`.

### Anti-Pattern 3: Offset Pagination for Listings Feed

**What people do:** `SELECT * FROM listings LIMIT 20 OFFSET 100`.

**Why it's wrong:** At offset 500+, PostgreSQL must scan and discard rows (slow). Worse: if a new listing is inserted while a user is scrolling, items shift and the user sees duplicates or misses listings.

**Do this instead:** Keyset pagination using `(created_at, id)` as a composite cursor.

### Anti-Pattern 4: Flat Listing Table with Vehicle-Specific Columns

**What people do:** Add columns: `battery_kwh`, `engine_cc`, `gear_count`, `range_km` — all NULLable, mostly empty.

**Why it's wrong:** Wide sparse tables. Schema migrations required for every new vehicle feature. Query results have many NULL columns that confuse API consumers.

**Do this instead:** Store common fields in columns, type-specific fields in `attributes JSONB`. The GIN index makes future search on JSONB cheap.

### Anti-Pattern 5: JWT in AsyncStorage (React Native)

**What people do:** Store JWT token with `AsyncStorage.setItem('token', jwt)`.

**Why it's wrong:** AsyncStorage is unencrypted. On rooted/jailbroken devices, any app can read it. This exposes user auth tokens.

**Do this instead:** Use `expo-secure-store` (wraps iOS Keychain and Android Keystore). For React Native without Expo, use `react-native-keychain`.

---

## Integration Points

### External Services

| Service | Integration Point | Pattern | Notes |
|---------|-------------------|---------|-------|
| MSG91 | FastAPI `services/msg91_service.py` | REST POST to MSG91 OTP API | Store API key in Railway env var. Wrap in try/except; SMS failure should not crash OTP request — return error to client gracefully |
| Cloudinary | 1. FastAPI signs upload params. 2. RN app uploads directly | Signed upload preset | Create a dedicated upload preset in Cloudinary dashboard. Restrict to image types, max size 10 MB. Store cloud name + API key/secret in Railway env vars |
| Cloudinary CDN | React Native `<Image>` src URLs | URL transform strings | No SDK needed on client for delivery; just construct the URL |
| PostgreSQL | FastAPI via SQLAlchemy async | Async ORM (`asyncpg` driver) | Use `AsyncSession` throughout; avoid sync SQLAlchemy in async FastAPI |

### Internal Component Boundaries

| Boundary | Communication | Direction | Notes |
|----------|---------------|-----------|-------|
| RN App ↔ FastAPI | HTTPS JSON REST | Bidirectional | Axios client, JWT in `Authorization: Bearer` header |
| RN App → Cloudinary | HTTPS multipart (upload) | Client → Cloudinary only | Signed params fetched from FastAPI first |
| RN App ← Cloudinary CDN | HTTPS image delivery | CDN → Client | Via `<Image>` component with transform URL |
| FastAPI ↔ PostgreSQL | TCP (SQLAlchemy asyncpg) | Bidirectional | Connection pool via Railway private network |
| FastAPI → MSG91 | HTTPS REST | FastAPI → MSG91 | Fire-and-confirm; log failures |
| FastAPI → Cloudinary | HTTPS REST (sign only) | FastAPI → Cloudinary | Only for computing HMAC signature; no image data |

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–1K users / MVP | Single Railway service. All on one FastAPI instance. Railway Postgres. No caching. Cloudinary free tier (25GB storage, 25GB bandwidth). This is the right architecture — do not over-engineer. |
| 1K–50K users | Add Redis for OTP session storage (remove DB dependency for OTP). Add DB read replica. Enable PostGIS for radius search. Add Cloudinary transform caching (already built-in via CDN). Consider Railway Pro plan. |
| 50K–500K users | Horizontal FastAPI replicas behind Railway load balancer (or migrate to a container platform). Separate listing search into Elasticsearch or pg_search. CDN for API responses (listings feed changes slowly). |
| 500K+ users | Dedicated search service (Elasticsearch/Typesense). Separate image metadata service. Read/write DB split. This is a "good problem" milestone — revisit architecture then. |

**First bottleneck:** PostgreSQL queries on the listings feed, specifically the `city` + `status` filter without proper composite indexing. The `idx_listings_feed` partial index above prevents this.

**Second bottleneck:** Cloudinary bandwidth on the free tier (~25 GB/month). Mitigation: use `q_auto,f_webp` transforms on all delivery URLs (reduces size 40-60% vs JPEG). Move to Cloudinary's paid tier when needed (~$89/month for 225 GB bandwidth).

---

## Build Order Implications

The architecture has clear dependency chains that dictate phase ordering:

```
1. Database schema + migrations (Alembic)
   └── Required by: everything
       
2. FastAPI skeleton + auth (OTP → JWT)
   └── Required by: all protected endpoints
   └── Depends on: users table, otp_sessions table

3. Cloudinary upload signature endpoint
   └── Required by: listing creation
   └── Depends on: auth (must be authenticated to get signature)

4. Listing CRUD endpoints (create, read, list)
   └── Required by: React Native feed + detail screens
   └── Depends on: listings table, images table, auth

5. React Native auth screens (phone + OTP)
   └── Required by: all authenticated app flows
   └── Depends on: FastAPI auth endpoints

6. React Native listing creation (form + image upload)
   └── Required by: any listings in the system
   └── Depends on: upload-signature endpoint, Cloudinary setup

7. React Native feed + detail screens
   └── Required by: buyer-facing product
   └── Depends on: listings endpoints

8. React Native profile / my listings management
   └── Required by: seller edit/delete
   └── Depends on: all of the above
```

**Never build the frontend before the API it calls.** Mock data in the frontend is acceptable for UI work, but integration must follow the backend contract. Define shared types (Pydantic schemas → TypeScript types) early and keep them in sync.

---

## Sources

- Cloudinary documentation on signed uploads and upload presets: https://cloudinary.com/documentation/upload_images (confidence: HIGH — long-standing documented pattern)
- FastAPI official docs on larger applications with multiple files: https://fastapi.tiangolo.com/tutorial/bigger-applications/ (confidence: HIGH)
- PostgreSQL JSONB documentation for flexible attributes: https://www.postgresql.org/docs/current/datatype-json.html (confidence: HIGH)
- Keyset pagination pattern: widely documented in PostgreSQL performance resources (confidence: HIGH)
- expo-secure-store for JWT storage: https://docs.expo.dev/versions/latest/sdk/securestore/ (confidence: HIGH)
- Note: External search tools were unavailable during this research session. All findings are based on training knowledge of stable, well-documented architectural patterns. Confidence is HIGH for structural decisions and MEDIUM for any Cloudinary-specific API parameter names (verify against Cloudinary docs before implementation).

---
*Architecture research for: Revvbase — second-hand 2-wheeler marketplace (India)*
*Researched: 2026-05-03*
