# Phase 6: Listing image management - Research

**Researched:** 2026-08-01
**Domain:** Browser image normalization, Supabase Storage security, and provider-neutral media persistence
**Confidence:** MEDIUM

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

### Storage-provider boundary
- **D-01:** Use Supabase Storage for this phase, but application code must use a provider-neutral image-storage interface. The listing feature must not contain Supabase Storage calls, bucket paths, or provider-specific URLs outside the infrastructure adapter. A future R2 adapter should implement the same internal contract. — **Reversibility:** costly — the interface becomes the boundary used by forms, data access, and rendering.
- **D-02:** Listing image objects use public, stable CDN-addressable URLs, including objects attached to a `draft` listing. Object authorization still restricts upload and deletion to the listing owner; deleting an image removes the object permanently. Draft listing records and image metadata remain owner-visible only in the application; public listing queries return active records only. Signed URLs and private draft staging/promotion are deferred production hardening.
- **D-03:** Model images as a separate one-to-many `listing_images` resource with listing reference, storage key, stable public URL/derivation, and creation order. The first uploaded image is the cover. Reordering is deferred. — **Reversibility:** costly — this replaces the legacy single `listings.image_url` field and establishes the public data contract.

### Upload, optimization, and lifecycle
- **D-04:** A listing may have at most five images. Image-less listings remain allowed, and that requirement is configurable.
- **D-05:** Accept user photo formats, including iPhone HEIC where technically supportable; reject non-image/corrupt files with a clear per-file message. Store a browser-friendly optimized canonical image (WebP or JPEG); do not retain originals. The stored canonical image is capped at 1 MB. — **Reversibility:** costly — changing the canonical format or retaining originals affects stored assets and migration behavior.
- **D-06:** Preserve enough visual quality and resolution for a future zoomable listing-detail experience, while generating/serving appropriate smaller display variants if the selected architecture supports them.
- **D-07:** Add and delete image actions take effect immediately and independently of listing text-field saves. Failed validation or upload must leave existing images untouched and communicate a per-file cause.
- **D-08:** Removing an image or deleting its listing permanently deletes associated storage objects and metadata; no retention window or per-user quota is required in this phase.

### Application configuration
- **D-09:** Add a versioned, extensible JSON configuration file for static application settings. Its initial responsibility is image-upload rules: images required, maximum images per listing, accepted source types, stored size cap, and image processing/display limits needed by the implementation. The schema should be easy to extend to other static application settings later.
- **D-10:** Configuration changes take effect when the application is rebuilt and deployed. The configuration is a shared source for application validation and UX, not a substitute for server/storage-side authorization and enforcement.
- **D-11:** `images.required` controls protected draft publication. Every new listing is initially `draft`; `false` permits protected activation with zero images, while `true` requires a persisted image before activation. Draft records and metadata are owner-visible and excluded from public listing queries; their public-bucket object URLs remain intentionally reachable in this MVP. Removing the final image from an active required-image listing first returns it to `draft`, then permanently removes object and metadata; listing-wide cleanup continues object → metadata → `deleted`.

### the agent's Discretion
- Determine the exact provider-neutral interface, configuration file location/schema, canonical encoding library or service, dimensions/quality targets, database migration sequence, and thumbnail/variant approach after researching browser and Supabase constraints.
- Preserve graceful placeholder behavior when no image exists or an image cannot load, and follow existing accessible pending/error-state patterns.

### Deferred Ideas (OUT OF SCOPE)

- Image reordering and manually selecting a cover image.
- Listing-detail gallery and zoom UI.
- Cloudflare R2 integration or any other second provider; only the migration-ready boundary is in scope.
- Private/signed image delivery, private draft-bucket staging and promotion to public delivery, image retention/recovery, user-wide quotas, moderation, and advanced image processing.
</user_constraints>

## Summary

Use a **public `listing-images` Supabase bucket** with a provider-neutral application contract. The browser must normalize a selected photo to one canonical WebP file before upload, then use the contract to upload it, create one `listing_images` metadata row, and obtain a stable public URL. This MVP intentionally permits that object URL to resolve even while its parent listing is a draft; privacy at this stage is limited to owner-only application visibility of draft listings and their metadata. The listing UI interacts only with a `ListingImageService`; the Supabase-specific bucket name, key convention, Storage SDK calls, and public URL derivation remain inside a Supabase adapter. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] [CITED: https://supabase.com/docs/guides/storage/serving/downloads]

Public delivery is compatible with strict write access: a public bucket bypasses read authorization only. Browser uploads require narrowly scoped RLS policies on `storage.objects`; permanent object deletion is reserved for the JWT-validated lifecycle Edge Function so it can preserve metadata/status sequencing. Use a key owned by the authenticated user, `sellerId/listingId/random-id.webp`, and policy predicates that check both that first segment and the referenced listing's `seller_id`. Do not manipulate `storage.objects` directly: Supabase documents that metadata deletion alone does not delete the provider object. [CITED: https://supabase.com/docs/guides/storage/security/access-control] [CITED: https://supabase.com/docs/guides/storage/schema/design]

The selected 1 MB limit must be enforced **after** transformation—the actual stored file—not against the camera original. Browser Canvas can encode JPEG/WebP, but HEIC/HEIF is not a safe native decode assumption across all target browsers; the image normalizer needs a dynamically imported, reviewed HEIC decoder for those source files and must report a clear failure where conversion cannot run. The planner must include a human package-legitimacy checkpoint before selecting/installing that decoder, because registry metadata could not be verified in this research environment. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob]

**Primary recommendation:** Build a client-only `normalizeListingImage()` pipeline that produces one WebP asset (long edge 2560 px; quality is stepped down until ≤1 MB), then persist it through an application-owned `ListingImageStorage` contract backed by a Supabase adapter. Use `listing_images` metadata plus a database-enforced maximum-count trigger and a protected lifecycle function: new listings start as owner-only `draft`; a database-mirrored `images.required` policy permits activation with zero images only when false; final-image removal from an active required listing first returns it to draft; and listing-wide cleanup removes real storage objects before metadata before setting `deleted`.

## Architectural Responsibility Map

| Capability | Primary Tier | Secondary Tier | Rationale |
|---|---|---|---|
| Source file selection, previews, normalization, per-file errors | Browser / Client | — | File APIs, Canvas, and HEIC WASM execute locally; original files never need to be retained or sent. |
| Provider-neutral upload/delete contract | Browser / Client | API / Backend | UI calls an app contract; current adapter uses the authenticated Supabase client, while a future R2 adapter may use a protected API route or Edge Function. |
| Object bytes, stable public delivery | Database / Storage | CDN / Static | Supabase Storage owns object bytes; its public bucket delivers stable CDN-addressable URLs. |
| Image metadata and cover ordering | Database / Storage | Browser / Client | `listing_images` is the durable one-to-many domain record; `created_at`/monotonic order determines cover. |
| Owner authorization and cross-resource invariant | Database / Storage | API / Backend | RLS and database trigger/RPC enforce owner and max-count rules even if client-side checks are bypassed. |
| Listing publication and permanent cleanup | API / Backend | Database / Storage | A single protected lifecycle operation activates drafts only under the mirrored image policy, coordinates final-photo draft reversion, and handles object/metadata/deleted sequencing; database cascades only remove metadata, not Storage bytes. |
| Static upload settings | Browser / Client | Database / Storage | Versioned JSON controls UX/normalizer; the migration-owned policy mirror controls lifecycle authorization and must ship in the same release. |

## Project Constraints (from AGENTS.md)

- Continue the React/Next.js and Supabase stack; do not introduce FastAPI, Railway, Cloudinary, mobile tooling, or a new backend without a later product decision.
- Browser code may use only Supabase's publishable key. Never expose a service-role key.
- RLS is mandatory: anonymous users read active listings only; owners alone can mutate their resources. UI checks are not authorization.
- Images are optional in the current product model and retain stock-placeholder rendering when no image exists.
- Planning artifacts are being produced through the GSD workflow; no application implementation changes belong in this research step.

## Standard Stack

### Core

| Library / facility | Version | Purpose | Why standard |
|---|---:|---|---|
| `@supabase/supabase-js` | 2.111.0 (installed) | Authenticated Storage upload/remove and PostgREST metadata access inside the Supabase adapter | Already installed, project-standard browser client; Storage upload supports path, content type, cache control, and non-upsert behavior. [CITED: https://supabase.com/docs/reference/javascript/file-buckets-upload] |
| Supabase Storage public bucket + `storage.objects` RLS | Hosted service | Object persistence, CDN delivery, write authorization | Public is appropriate for marketplace photos; upload/delete remain policy controlled. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals] |
| PostgreSQL migration, RLS, trigger/function | Supabase PostgreSQL | Image metadata, owner checks, cap enforcement, deletes | The existing project already uses SQL migrations/RLS; relational constraints cannot be trusted to browser code. |
| Browser Canvas / `createImageBitmap` / `toBlob` | Web platform | Resizing and canonical WebP encoding | `toBlob(type, quality)` is broadly available, but actual output MIME must be checked because unsupported encodings fall back to PNG. [CITED: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob] |

### Supporting

| Library / facility | Version | Purpose | When to use |
|---|---:|---|---|
| HEIC/HEIF decoder, dynamically imported | TBD, human-verified | Decode HEIC/HEIF to a Canvas/bitmap-compatible JPEG/PNG source | Only for HEIC/HEIF; select a maintained client-side decoder at implementation after legitimacy review. A current candidate is `heic-to` [ASSUMED]. |
| `browser-image-compression` | TBD, human-verified | Optional worker-based resize/compression helper | Use only if its reviewed behavior produces the required canonical output and gives less custom image-processing code. Candidate package is [ASSUMED] and must pass the checkpoint below. |
| `next/image` | Next.js 16.2.12 (installed) | Optimized public-card rendering | Configure a narrow `remotePatterns` entry for the Supabase public object URL when switching cards from plain `<img>`. [CITED: https://nextjs.org/docs/app/api-reference/components/image] |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|---|---|---|
| Client normalization + direct Supabase adapter | Server/Edge Function image processing | Stronger uniform decoding and secret-managed provider writes, but adds compute/service design and moves the MVP's small, direct authenticated upload path server-side. Deferred unless HEIC package verification or device testing fails. |
| Store one canonical original-sized WebP | Store canonical plus card/detail variants | Variants reduce transfer for cards, but add transformation/storage lifecycle and complicate provider-neutral contract. Store one max-2560px canonical asset now; let Next/Supabase delivery optimization be a later change behind `publicUrl`. |
| Public stable URL, including drafts | Signed URLs or private staging/promotion | Signed URLs and private draft staging are deferred production hardening; this MVP accepts publicly resolvable object URLs while application queries still hide draft records and metadata. |

**Installation:**

```bash
# Do not install until a human verifies the chosen HEIC decoder and optional compressor.
npm install <reviewed-heic-decoder> [<reviewed-compression-helper>]
```

**Version verification:** `@supabase/supabase-js` 2.111.0, Next 16.2.12, and Vitest 4.1.10 are verified from the current `package.json`. `npm view` requests and package-legitimacy enrichment could not reach registry metadata in this sandbox, so no new package version/publish date is asserted.

## Package Legitimacy Audit

| Package | Registry | Age | Downloads | Source repo | Verdict | Disposition |
|---|---|---:|---:|---|---|---|
| `heic-to` [ASSUMED] | npm | unavailable | unavailable | `github.com/hoppergee/heic-to` found via web search | SUS | Flagged — planner must add `checkpoint:human-verify` before install. |
| `browser-image-compression` [ASSUMED] | npm | unavailable | unavailable | `github.com/Donaldcwl/browser-image-compression` referenced by npm search result | SUS | Flagged — planner must add `checkpoint:human-verify` before install; optional, not required if the normalizer is implemented with reviewed platform APIs. |

**Packages removed due to [SLOP] verdict:** none.

**Packages flagged as suspicious [SUS]:** `heic-to`, `browser-image-compression`. The legitimacy service returned incomplete registry signals and `npm view` returned no metadata in this sandbox, so neither package may be treated as approved. The implementation plan must hold at a human verification checkpoint (official project repository, npm metadata/version, recent maintenance, license, and no suspicious lifecycle script) before any installation.

## Architecture Patterns

### System Architecture Diagram

```text
[seller selects source File(s)]
              |
              v
[client source validation: count/type/corrupt] --invalid--> [per-file error; keep existing images]
              |
              v
[client-only normalizer]
  HEIC/HEIF --decoder--> bitmap --+
  JPEG/PNG/WebP -----------> bitmap --+--> [resize long edge <= 2560]
                                             |
                                             v
                              [WebP encode, lower quality until <= 1 MB]
                                             |
                              fail/too large v
                                  [per-file error]
                                             |
                                             v
[ListingImageService (provider-neutral)]
              |
              v
[SupabaseListingImageStorage adapter]
  upload: sellerId/listingId/randomId.webp
              |
              v
[Supabase public Storage bucket] <---- RLS INSERT/SELECT/DELETE ---- authenticated owner
              |
              v
[register listing_images metadata] --fails--> [remove uploaded object; show error]
              |
              v
[listing_images row: storage_key, public_url, position/created_at]
              |
              +--> [public card selects first image] --> [stable CDN public URL]

[remove image / soft-delete listing]
              |
              v
[application cleanup service removes provider objects] --> [delete metadata / set listing status deleted]
```

### Recommended Project Structure

```text
src/
├── config/
│   └── app-settings.json              # versioned static settings; image-upload rules now
├── lib/
│   ├── listing-images.ts              # domain types, config-derived validation, mapping/select-cover helpers
│   ├── image-normalizer.client.ts     # client-only decode/resize/encode boundary
│   ├── storage/
│   │   ├── listing-image-storage.ts   # provider-neutral contract and factory
│   │   └── supabase-listing-images.ts # only place with bucket/path/Storage SDK knowledge
│   └── database.types.ts              # ListingImage and listing relation shape
├── components/
│   ├── listing-image-manager.tsx      # add/delete controls, previews, accessible progress/error UI
│   ├── listing-form.tsx               # hosts manager for persisted listings; no provider SDK calls
│   └── listing-card.tsx               # first-image-or-placeholder rendering
└── app/
    └── ...                            # queries include ordered image metadata
supabase/
└── migrations/
    └── <phase6>_listing_images.sql    # bucket, table, RLS, cap trigger/RPC, legacy migration
```

### Pattern 1: Provider-neutral write model

**What:** The UI/domain layer receives a `ListingImageStorage` instance and only handles a normalized `File`, `listingId`, `sellerId`, and returned application object (`storageKey`, `publicUrl`). The Supabase implementation privately derives object keys and calls the Storage SDK.

**When to use:** Every add/delete/listing-cleanup operation. Never import the Supabase client or bucket name into `listing-image-manager.tsx`, `listing-form.tsx`, cards, or listing-domain helpers.

**Example:**

```ts
// Application-owned contract; source-specific URL shape is deliberately opaque.
export interface ListingImageStorage {
  upload(input: {
    listingId: string;
    sellerId: string;
    file: File; // canonical WebP, already verified <= configured stored cap
  }): Promise<{ storageKey: string; publicUrl: string; contentType: "image/webp" }>;
  remove(input: { storageKey: string }): Promise<void>;
}
```

### Pattern 2: Persisted listing before immediate images

**What:** An image must be associated with a real listing UUID for owner-scoped Storage RLS and metadata. The create flow first persists the listing, then routes/continues in its edit state where image operations are immediate. Edit-state image changes never wait for nor alter unsaved text fields.

**When to use:** Create and edit forms. This avoids unauthorizable temporary keys, abandoned pre-save files, and a second draft-lifecycle model.

**Implementation note:** The form should state this plainly during initial creation (for example, “Publish the listing to add photos”) and route to its edit form on success. This is the only lifecycle consistent with D-07 and direct owner-scoped Storage without inventing listing drafts.

### Pattern 3: Compensating cleanup, not cross-system transaction

**What:** Storage object and Postgres metadata are separate services and cannot form one browser transaction. Upload then insert metadata; if metadata insertion fails, invoke adapter `remove(storageKey)`. For deletion, remove object first and remove metadata only after success; report failures and leave metadata visible/retryable rather than silently losing the reference.

**When to use:** Each immediate remove, and listing deletion. A future service-backed provider can implement the same operation atomically enough for its platform without changing UI.

### Pattern 4: Ordered rows determine the cover

**What:** Add `sort_order integer not null` (or immutable insertion ordinal) to `listing_images`; every new row is appended. Query images ordered by `sort_order, created_at, id`; the first result is the cover. On deletion, cover naturally advances to the next row. Do not build reorder UI.

**When to use:** Feed card and owner cards. Add a unique `(listing_id, sort_order)` constraint; allocate the next position in a database function/trigger that locks the listing row to avoid concurrent duplicates.

### Pattern 5: Config is UX source; storage/database rules are deployment mirrors

**What:** Place a schema-versioned JSON file at `src/config/app-settings.json`, import it through a typed parser/validator, and derive all client messages/limits from it. Mirror the current byte limit in the bucket configuration and max-count/ownership in database enforcement.

**When to use:** Validation and processing only. Do not claim that a bundled JSON file protects direct Supabase calls—an attacker can bypass it.

**Recommended initial shape:**

```json
{
  "schemaVersion": 1,
  "images": {
    "required": false,
    "maxPerListing": 5,
    "acceptedSourceMimeTypes": ["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"],
    "canonical": { "mimeType": "image/webp", "maxBytes": 1048576, "maxLongEdgePx": 2560, "initialQuality": 0.86, "minimumQuality": 0.5 },
    "display": { "cardLongEdgePx": 960 }
  }
}
```

The plan must add a documented deployment checklist: changing `maxPerListing`, `maxBytes`, or accepted stored MIME types requires updating the JSON **and** a matching Supabase migration/bucket setting before deployment. This preserves D-10 without presenting client JSON as security enforcement.

### Anti-Patterns to Avoid

- **A direct Storage call in a listing component:** leaks provider assumptions into UI and makes R2 migration a component rewrite. Put it in the adapter only.
- **Trusting `File.type`, filename, or pre-compression size:** they are user-controlled/irrelevant to stored canonical limit. Decode successfully, encode canonical form, then inspect its MIME and size.
- **Storing the original as a fallback:** violates D-05, doubles lifecycle work, and can leak EXIF/location data.
- **Writing/deleting `storage.objects` with SQL:** Supabase warns its schema is metadata-only; direct metadata delete leaves the actual object billed and unreachable. Use Storage APIs. [CITED: https://supabase.com/docs/guides/storage/schema/design]
- **Making an entire public bucket writable:** public only needs public read; write policies must restrict bucket, first key segment, and owner listing relation. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals]
- **Assuming a client check enforces five images:** use a database cap guard as well; client checks only improve UX.
- **Retaining `listings.image_url` as a competing source of truth:** migrate legacy external URLs deliberately or replace them with the placeholder. Feed/card data must select one ordered `listing_images` relation.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---|---|---|---|
| Object authentication and CDN URL delivery | Custom upload API/proxy or handcrafted signed URL scheme | Supabase Storage SDK, public bucket, and `storage.objects` RLS | Correct authorization/caching behavior is already in Supabase. |
| HEIC/HEIF binary decoding | A custom HEIF parser/decoder | A human-reviewed browser HEIC decoder/WASM package | HEIF codecs and browser compatibility are complex; it must be a reviewed dependency. |
| Security of image bytes | MIME/extension-only acceptance | Successful decode + canonical re-encode + bucket MIME/size limits | A normalizer proves the browser can decode the content and strips noncanonical payload/metadata. |
| Durable cap/order under concurrent requests | Client state counters or `max()+1` alone | Database trigger/function with row lock and unique order constraint | UI state can be bypassed and concurrent uploads can race. |
| Provider migration | Conditional `if (provider === ...)` code across UI | Small storage interface + adapter implementation | It localizes provider differences (auth mechanism, key creation, URL construction, delete) to one seam. |

**Key insight:** the browser can own user experience and normalization, but it cannot provide authority or transactionality. Treat the Storage adapter as infrastructure and use Supabase RLS plus database invariants for authorization and durability.

## Common Pitfalls

### Pitfall 1: Public means publicly writable
**What goes wrong:** A developer sets the bucket public and assumes write access is either safe or automatic.

**Why it happens:** Public buckets only bypass read access. Upload/delete remain subject to Storage RLS and missing policies yield 403 errors. [CITED: https://supabase.com/docs/guides/storage/buckets/fundamentals]

**How to avoid:** Create browser policies for `INSERT` and matching `SELECT` scoped to `listing-images`, the authenticated user key prefix, and the listing owner relationship. Reserve object deletion for the protected lifecycle function, and test owner, different-user, anonymous, and direct-browser-delete denial.

**Warning signs:** Upload returns an RLS 403 even with a valid session; Supabase notes its upload API performs a `RETURNING` operation, so a matching `SELECT` policy may be necessary. [CITED: https://supabase.com/docs/guides/troubleshooting/storage-error-403-forbidden-new-row-violates-row-level-security-policy-on-upload-a94384]

### Pitfall 2: Orphaned byte objects
**What goes wrong:** Metadata insert fails after successful upload, or a listing is deleted with only SQL cascade; bytes remain in Storage.

**Why it happens:** Storage and Postgres actions are not a shared browser transaction; Storage schema metadata is not the object itself.

**How to avoid:** Implement compensating cleanup and an explicit listing-delete operation; never delete rows from `storage.objects` directly. Use the adapter's `remove` API. [CITED: https://supabase.com/docs/reference/javascript/file-buckets-remove] [CITED: https://supabase.com/docs/guides/storage/schema/design]

**Warning signs:** Storage dashboard contains keys not represented in `listing_images`; deleting a listing only changes its status/row but URLs continue to serve.

### Pitfall 3: 1 MB source-limit instead of stored-file-limit
**What goes wrong:** A 3 MB camera image that compresses well is rejected, or a small PNG expands after conversion and is stored over cap.

**Why it happens:** The decision constrains the stored canonical file.

**How to avoid:** Permit a separate input safety ceiling only to protect browser memory (recommend 20 MB source file, configurable), normalize, then test output bytes ≤1,048,576. Encode with a bounded quality loop, then reject with a “cannot fit within quality limits” message rather than silently producing unusable photos.

### Pitfall 4: HEIC accepted by input but not actually decodable
**What goes wrong:** The picker accepts `.heic`, but a non-Safari browser cannot decode it into Canvas.

**Why it happens:** Canvas can encode a bitmap but does not itself provide HEIF decoding.

**How to avoid:** Feature-test/route HEIC and HEIF through one dynamically imported, verified decoder; on decoder load/decode failure, leave existing photos unchanged and state the file could not be converted. Include physical iPhone and Chrome/Android manual smoke tests.

### Pitfall 5: Cover ordering changes unpredictably
**What goes wrong:** Two uploads get the same order or deletion leaves a blank cover.

**Why it happens:** “First” is not a reliable query contract without ordering and concurrent inserts race.

**How to avoid:** Database-owned appended order with uniqueness; every read selects order explicitly. The card chooses element zero, then existing placeholder fallback.

### Pitfall 6: Switching immediately to `next/image` without remote configuration
**What goes wrong:** Render fails because external Supabase URLs are not allowed, or an overly broad remote configuration lets arbitrary remote URLs hit Next's optimizer.

**How to avoid:** Add one narrow HTTPS `remotePatterns` rule for the project’s Supabase Storage public path. Next documents this as the restrictive current configuration. [CITED: https://nextjs.org/docs/app/api-reference/components/image]

### Pitfall 7: Image cleanup must preserve the current soft-delete listing lifecycle
**What goes wrong:** Existing `MyListingCard` only sets `status = 'deleted'`, leaving public URLs and image objects indefinitely.

**How to avoid:** Phase 6 must route the owner action through protected image cleanup, permanently remove every image object and metadata row, then update the existing listing row to `status = 'deleted'`. Browser roles must not be able to perform that status transition directly. This preserves the established listing lifecycle while preventing orphaned public bytes.

## Code Examples

Verified patterns from official sources:

### Supabase adapter upload and stable URL derivation

```ts
// Source: https://supabase.com/docs/reference/javascript/file-buckets-upload
// Source: https://supabase.com/docs/guides/storage/serving/downloads
const upload = await supabase.storage
  .from(BUCKET)
  .upload(storageKey, canonicalFile, {
    cacheControl: "31536000",
    contentType: canonicalFile.type,
    upsert: false,
  });

if (upload.error) throw upload.error;

const { data } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);
return { storageKey, publicUrl: data.publicUrl, contentType: "image/webp" as const };
```

### Owner-scoped Storage policy shape

```sql
-- Source pattern: https://supabase.com/docs/guides/storage/security/access-control
create policy "Owners upload listing images"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'listing-images'
  and (storage.foldername(name))[1] = (select auth.uid()::text)
  and exists (
    select 1
    from public.listings l
    where l.id::text = (storage.foldername(name))[2]
      and l.seller_id = (select auth.uid())
  )
);
```

The planner must make the `SELECT` and `DELETE` policies equivalent in scope and test them. Do not copy this sample verbatim without confirming exact key segment types and migration SQL syntax against the project.

### Canonical Canvas encode guard

```ts
// Source: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob
function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob || blob.type !== "image/webp") {
        reject(new Error("This browser could not create a WebP image."));
        return;
      }
      resolve(blob);
    }, "image/webp", quality);
  });
}
```

## State of the Art

| Old approach in this project | Current Phase 6 approach | Impact |
|---|---|---|
| Optional `listings.image_url` string points at arbitrary external image | Ordered `listing_images` records point at application-owned canonical object keys/URLs | Reliable ownership, cleanup, and cover selection; remove legacy external URL as a source of truth. |
| Plain dynamic `<img>` sourced from unbounded seller URL | Public provider URL with controlled host/path; optionally `next/image` with narrow remote pattern | Safer, cacheable, provider-swappable rendering boundary. |
| Soft-delete listing row only | Coordinated provider object removal plus metadata deletion, followed by protected listing soft delete | Meets permanent image-cleanup decision while preserving the listing lifecycle; requires explicit failure/retry UX. |

**Deprecated/outdated:**

- `listings.image_url` as an editable external URL: replace in this phase. It cannot establish owner-managed persistence, content limits, or guaranteed cleanup.
- Directly modifying `storage.objects`: Supabase documents this is metadata and advises using Storage APIs for object operations. [CITED: https://supabase.com/docs/guides/storage/schema/design]

## Assumptions Log

| # | Claim | Section | Risk if Wrong |
|---|---|---|---|
| A1 | `heic-to` is a suitable current HEIC decoder candidate. | Supporting stack | It may be unmaintained/incompatible or unsafe; human verification is mandatory before installation. |
| A2 | `browser-image-compression` is useful as an optional helper for the required normalization. | Supporting stack | It may not meet canonical-WebP/HEIC requirements; implementation may instead use reviewed platform APIs. |
| A3 | 2560 px long edge and a 0.86→0.5 WebP quality range preserve adequate vehicle-detail zoom quality under 1 MB. | Primary recommendation / config | Real photos may need different quality/dimension tradeoffs; device/photo sample QA can tune static config without UI code changes. |
| A4 | A 20 MB configurable input safety ceiling is reasonable for mobile-browser memory protection. | Pitfall 3 | It may reject useful camera files or still be too memory-intensive on low-end devices; tune after manual testing. |

## Resolved Planning Decisions

1. **Configuration deployment mirror — resolved.** A configuration change release is a paired change: update the versioned JSON consumed by browser validation/UX and the matching committed Supabase migration that mirrors canonical MIME, canonical byte cap, and count enforcement. The Phase 6 release gate checks this paired-change checklist before deployment. This fulfills D-09/D-10 without pretending browser JSON authorizes requests.

2. **HEIC decoder — resolved to a human package-approval gate.** No package is preselected. The implementation installs exactly the package and version approved at the retained checkpoint, dynamically imports it only in the client normalizer, and keeps JPEG/PNG/WebP usable if a particular HEIC conversion fails. This fulfills D-05's "where technically supportable" boundary.

3. **Draft publication and deletion recovery — resolved to protected lifecycle operations.** New listings are always inserted as `draft`. A JWT-validated Supabase Edge Function reads the migration-owned mirror of `images.required` before activating: zero images are allowed only when the mirror is false; otherwise one persisted row is required. Public listing policies remain `status = 'active'`, while owner policies include drafts. The public bucket deliberately serves stable object URLs for draft photos too; private staging and promotion are deferred production hardening. For final-photo removal from an active required listing, the function first changes the listing to `draft`, then removes the object and metadata; if removal fails it remains a safe draft with the image available for retry or republish. For listing-wide deletion it enumerates authoritative metadata, removes every object, deletes metadata, then changes the existing row to `deleted`. Direct browser status changes and deletes are denied. This fulfills D-08 and D-11 without orphaning an active required-image listing.

## Environment Availability

| Dependency | Required by | Available | Version | Fallback |
|---|---|---:|---:|---|
| Node.js | Next build, client normalization packages, tests | ✓ | v24.16.0 | — |
| npm | package verification/install and test scripts | ✓ | 11.13.0 | — |
| Supabase CLI | local migration/link/deploy verification | ✓, but sandbox write check failed | version unreadable in sandbox | Use hosted SQL editor/project migration workflow; execution needs credentials/linked project. |
| Hosted Supabase project credentials | real Storage RLS/bucket smoke testing | unknown | — | Unit tests plus manual hosted smoke test when credentials are available. |
| HEIC decoder package | HEIC conversion | not selected | — | Human verification checkpoint; reject only HEIC conversion if no approved package. |

**Missing dependencies with no fallback:** none for planning. A linked/credentialed Supabase project is required before end-to-end Storage policy validation in execution.

**Missing dependencies with fallback:** Supabase CLI telemetry could not write outside the workspace sandbox; hosted SQL/Dashboard or an execution environment with normal home-directory access can run the same migration work.

## Validation Architecture

### Test Framework

| Property | Value |
|---|---|
| Framework | Vitest 4.1.10 |
| Config file | `vitest.config.ts` |
| Quick run command | `npm test -- src/lib/listing-images.test.ts` |
| Full suite command | `npm test && npm run typecheck && npm run build` |

### Phase Requirements → Test Map

| Req ID | Behavior | Test type | Automated command | File exists? |
|---|---|---|---|---|
| IMG-01 (derive in planning) | Static JSON validates/parses; defaults expose optional, max=5, 1 MB rules | unit | `npm test -- src/lib/listing-images.test.ts` | ❌ Wave 0 |
| IMG-02 (derive in planning) | Source/canonical validation returns per-file errors and does not mutate prior images | unit | `npm test -- src/lib/listing-images.test.ts` | ❌ Wave 0 |
| IMG-03 (derive in planning) | Cover selector returns first ordered image or placeholder | unit | `npm test -- src/lib/listing-images.test.ts` | ❌ Wave 0 |
| IMG-04 (derive in planning) | Provider contract maps uploads/deletes without provider details in UI/domain code | unit with mocked adapter | `npm test -- src/lib/listing-image-storage.test.ts` | ❌ Wave 0 |
| IMG-05 (derive in planning) | RLS enforces owner only, count cap, and public reads | hosted integration/manual SQL smoke | project-specific Supabase workflow | ❌ Wave 0/manual |
| IMG-06 (derive in planning) | HEIC/JPEG/PNG/WebP conversion and real upload/delete work on target browsers | manual smoke | N/A | ❌ manual |

### Sampling Rate

- **Per task commit:** `npm test -- src/lib/listing-images.test.ts && npm run typecheck`
- **Per wave merge:** `npm test && npm run typecheck`
- **Phase gate:** `npm test && npm run typecheck && npm run build`, followed by hosted Supabase owner/other-user/anonymous smoke tests.

### Wave 0 Gaps

- [ ] `src/lib/listing-images.test.ts` — config parsing, image rule validation, cover/placeholder mapping.
- [ ] `src/lib/listing-image-storage.test.ts` — interface/adapter orchestration with mocked Storage client.
- [ ] Hosted SQL test script or checklist — bucket/RLS and permanent object deletion behavior against a real Supabase project.

## Security Domain

### Applicable ASVS Categories

| ASVS Category | Applies | Standard control |
|---|---|---|
| V2 Authentication | Yes | Existing Supabase Auth session; publishable key only in browser. |
| V3 Session Management | Yes | Existing `@supabase/supabase-js` persisted session; Storage calls use authenticated client JWT. |
| V4 Access Control | Yes | `listing_images` RLS, `storage.objects` insert/select/delete policies, listing owner existence check, database cap guard. |
| V5 Input Validation | Yes | Config-derived client validation, successful decode/re-encode, canonical MIME/byte checks, Storage bucket MIME/size restriction. |
| V6 Cryptography | No new primitive | Supabase HTTPS/CDN and authentication; do not hand-roll signing or encryption. |

### Known Threat Patterns for this stack

| Pattern | STRIDE | Standard mitigation |
|---|---|---|
| Upload to another seller's listing/key | Tampering / Elevation | RLS policy checks `auth.uid()`, user key prefix, and referenced listing `seller_id`; metadata RLS independently checks owner. |
| Delete another user's media | Tampering | Browser DELETE policies are absent; the lifecycle function verifies JWT ownership and authoritative metadata/key binding. |
| MIME/extension spoofing or malformed image | Tampering | Decode before use, canonical WebP encoding, inspect output MIME/bytes; bucket only accepts canonical MIME and max byte limit. |
| Object or metadata orphaning | Denial of service / cost | Adapter compensation and explicit listing cleanup; no direct Storage metadata mutation. |
| Excessive uploads / count bypass | Denial of service | Bucket byte cap, config UX checks, DB trigger/function cap with locking. |
| Arbitrary remote image optimization | SSRF-like resource abuse | Store only own provider URL and configure narrow Next `remotePatterns`; never preserve arbitrary external `image_url`. |
| EXIF location/device disclosure | Information disclosure | Canonical Canvas re-encode without retaining original; verify actual output excludes metadata in manual tests. |

## Sources

### Primary (MEDIUM confidence; official documentation accessed through web search because Context7 was unavailable)

- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control) — RLS on `storage.objects`, policy operation requirements, user-key folder predicate.
- [Supabase buckets fundamentals](https://supabase.com/docs/guides/storage/buckets/fundamentals) — public versus private buckets; public read versus write operations.
- [Supabase Storage ownership](https://supabase.com/docs/guides/storage/security/ownership) — `owner_id`, owner checks, deprecated `owner` field.
- [Supabase Storage schema](https://supabase.com/docs/guides/storage/schema/design) — do not mutate storage metadata directly; object bytes/metadata distinction; bucket constraints.
- [Supabase JavaScript upload](https://supabase.com/docs/reference/javascript/file-buckets-upload) and [remove](https://supabase.com/docs/reference/javascript/file-buckets-remove) — upload/remove method contracts.
- [Supabase serving downloads](https://supabase.com/docs/guides/storage/serving/downloads) — public stable URL/getPublicUrl behavior.
- [MDN Canvas `toBlob`](https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/toBlob) — encoding MIME/quality and fallback behavior.
- [Next.js Image component](https://nextjs.org/docs/app/api-reference/components/image) — strict `remotePatterns` requirement and security rationale.

### Secondary (MEDIUM confidence)

- [Supabase Storage RLS upload troubleshooting](https://supabase.com/docs/guides/troubleshooting/storage-error-403-forbidden-new-row-violates-row-level-security-policy-on-upload-a94384) — upload's `RETURNING` behavior and matching select policy.
- [heic-to project page](https://github.com/hoppergee/heic-to) — candidate browser HEIC conversion package only; package is unapproved and listed as assumed.

### Tertiary (LOW confidence)

- [browser-image-compression npm page](https://www.npmjs.com/package/browser-image-compression) — candidate helper only; no installation recommendation until human legitimacy checkpoint.

## Metadata

**Confidence breakdown:**

- Standard stack: MEDIUM — Supabase/Next/Canvas behavior is supported by current official docs; HEIC package choice remains unverified.
- Architecture: MEDIUM — follows locked decisions and verified Supabase security constraints; deletion recovery and server-config synchronization need implementation planning.
- Pitfalls: MEDIUM — sourced from current official Supabase/Next/MDN docs plus direct codebase analysis.

**Research date:** 2026-08-01
**Valid until:** 2026-08-31 for platform guidance; re-check HEIC package selection immediately before installation.
