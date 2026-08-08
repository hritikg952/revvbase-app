# Phase 6: Listing image management - Context

**Gathered:** 2026-08-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Add secure, owner-managed multi-image uploads to listings. Store optimized images in Supabase Storage behind an application-owned storage contract so a future Cloudflare R2 provider can be introduced without changing listing UI or domain behavior. Deliver public image rendering, immediate owner add/delete operations, configurable upload rules, database metadata, and permanent image cleanup. Image objects use stable public URLs even while their listing is a draft; draft listing and metadata records remain owner-only in the application. Reordering, a gallery/detail UI, private media, originals, and R2 integration itself remain outside this phase.

</domain>

<decisions>
## Implementation Decisions

### Storage-provider boundary
- **D-01:** Use Supabase Storage for this phase, but application code must use a provider-neutral image-storage interface. The listing feature must not contain Supabase Storage calls, bucket paths, or provider-specific URLs outside the infrastructure adapter. A future R2 adapter should implement the same internal contract. — **Reversibility:** costly — the interface becomes the boundary used by forms, data access, and rendering.
- **D-02:** Listing image objects use public, stable CDN-addressable URLs, including objects attached to a `draft` listing. Object authorization still restricts upload and deletion to the listing owner; deleting an image removes the object permanently. The application exposes draft listing records and metadata only to their owner and public listing queries return active records only. Signed URLs and private draft staging/promotion are deferred production hardening.
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
- **D-11:** `images.required` is an operational lifecycle setting. All newly created listings initially persist as non-public `draft` records. When it is `false`, the protected publish operation may activate a draft with zero images; when it is `true`, it may activate only after at least one image has been successfully persisted. Owners can manage and see drafts, while public reads return active listings only. Deleting the final image from an active required-image listing immediately transitions it to `draft` before permanent object/metadata removal, so an active required-image listing can never have zero images. Listing-wide cleanup still permanently removes objects and metadata before setting `status = 'deleted'`.

### the agent's Discretion
- Determine the exact provider-neutral interface, configuration file location/schema, canonical encoding library or service, dimensions/quality targets, database migration sequence, and thumbnail/variant approach after researching browser and Supabase constraints.
- Preserve graceful placeholder behavior when no image exists or an image cannot load, and follow existing accessible pending/error-state patterns.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Existing marketplace behavior and constraints
- `.planning/PROJECT.md` — current product boundary, Supabase architecture, and security constraints.
- `.planning/REQUIREMENTS.md` — existing optional-image and public-card requirements that Phase 6 extends.
- `.planning/phases/03-seller-listing-crud/03-CONTEXT.md` — owner CRUD and reusable listing form decisions.
- `.planning/phases/04-public-listings-feed/04-CONTEXT.md` — public card placeholder and loading/error conventions.
- `.planning/phases/05-mvp-validation-and-deployment/05-CONTEXT.md` — hosted Supabase and validation environment constraints.

### Current implementation integration points
- `src/lib/listings.ts` — legacy single-image form field, mapping, validation, and listing payload.
- `src/components/listing-form.tsx` — create/edit form that must receive owner image controls.
- `src/components/listing-card.tsx` — public card image and fallback behavior.
- `src/components/my-listing-card.tsx` — listing deletion flow that must trigger permanent image cleanup.
- `src/lib/database.types.ts` — generated listing contract that must evolve for image metadata.
- `supabase/migrations/20260730170000_create_mvp_schema.sql` — existing listings schema, RLS, and legacy `image_url` column.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `ListingForm`: shared create/edit client component with field-level errors and pending state.
- `ListingCard`: public image fallback to `/vehicle-placeholder.svg`.
- `MyListingCard`: owner deletion confirmation and Supabase mutation pattern.
- `getSupabaseBrowserClient`: existing browser client boundary for Supabase database access.

### Established Patterns
- Browser application uses only Supabase's publishable key and relies on RLS for authorization.
- Form mutations show clear pending and plain-language error states.
- Listings are soft-deleted today; image deletion is a new explicit permanent-resource lifecycle.

### Integration Points
- Replace the optional external `image_url` form field and single `listings.image_url` presentation with ordered image metadata.
- Add database/storage policies that connect image ownership to `listings.seller_id` without weakening current RLS guarantees.
- Ensure active public feed cards use the first image, otherwise the existing stock placeholder.
- Extend listing status from `active`/`deleted` to `draft`/`active`/`deleted`; owner flows must expose drafts without making them publicly readable.

</code_context>

<specifics>
## Specific Ideas

- Images should feel suitable for a future zoomable vehicle-detail experience even though that page/gallery is not part of this phase.
- Configuration should start small and focused on upload rules, while establishing a maintainable application-wide static-settings pattern.

</specifics>

<deferred>
## Deferred Ideas

- Image reordering and manually selecting a cover image.
- Listing-detail gallery and zoom UI.
- Cloudflare R2 integration or any other second provider; only the migration-ready boundary is in scope.
- Private/signed image delivery, private draft-bucket staging and promotion to public delivery, image retention/recovery, user-wide quotas, moderation, and advanced image processing.
- **Automatic cleanup retry scheduling:** Deferred after Phase 6 implementation. The protected `listing-image-cleanup-retry` Edge Function remains available for an operator to invoke manually with the service-role credential when a durable cleanup job is pending. Do not provision Supabase Vault, `pg_cron`, or `pg_net` solely for this MVP. Revisit automatic scheduling when operational volume justifies it; document and test the schedule then.

</deferred>

---

*Phase: 06-listing-image-management*
*Context gathered: 2026-08-01*
