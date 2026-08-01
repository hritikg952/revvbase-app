# Phase 6: Listing image management - Pattern Map

**Mapped:** 2026-08-01  
**Files analyzed:** 17 planned application/migration/test files  
**Analogs found:** 10 / 17

## File Classification

| New/Modified File | Role | Data Flow | Closest Analog | Match Quality |
|---|---|---|---|---|
| `src/config/app-settings.json` | config | transform | none | no analog |
| `src/lib/listing-images.ts` | utility/domain service | CRUD, transform | `src/lib/listings.ts` | role-match |
| `src/lib/image-normalizer.client.ts` | utility | file-I/O, transform | none | no analog |
| `src/lib/storage/listing-image-storage.ts` | service/contract | file-I/O, request-response | `src/lib/supabase.ts` | partial |
| `src/lib/storage/supabase-listing-images.ts` | infrastructure adapter | file-I/O, request-response | `src/lib/supabase.ts` | role-match |
| `src/components/listing-image-manager.tsx` | component | file-I/O, event-driven | `src/components/listing-form.tsx` | role-match |
| `src/components/listing-form.tsx` | component | CRUD, request-response | itself | exact |
| `src/components/listing-card.tsx` | component | request-response | itself | exact |
| `src/components/my-listing-card.tsx` | component | CRUD, request-response | itself | exact |
| `src/components/listings-feed.tsx` | component | CRUD, request-response | itself | exact |
| `src/app/my-listings/page.tsx` | page/component | CRUD, request-response | itself | exact |
| `src/app/listings/[id]/edit/page.tsx` | page/component | CRUD, request-response | itself | exact |
| `src/lib/listings.ts` | utility | CRUD, transform | itself | exact |
| `src/lib/database.types.ts` | model | transform | itself | exact |
| `src/app/globals.css` | stylesheet | event-driven | itself | exact |
| `supabase/migrations/<phase6>_listing_images.sql` | migration | CRUD, file-I/O | `supabase/migrations/20260730170000_create_mvp_schema.sql` | role-match |
| `src/lib/listing-images.test.ts`, `src/lib/listing-image-storage.test.ts` | test | transform, file-I/O | `src/lib/listings.test.ts` | role-match |

## Pattern Assignments

### `src/config/app-settings.json` (config, transform)

**Analog:** None. This is the first static application-settings file.

Use the schema/version layout recommended in [06-RESEARCH.md](06-RESEARCH.md#L232-L247). Keep it data-only and import it through a typed parser in `listing-images.ts`; components must not repeat limits as literals. The bundled JSON supplies UX/normalization rules only. The migration/bucket policy remains the enforcement mirror.

### `src/lib/listing-images.ts` (utility/domain service, CRUD + transform)

**Analog:** [`src/lib/listings.ts`](../../../src/lib/listings.ts#L1)

**Imports/type pattern** (lines 1-16):

```ts
import type { FuelType, Listing, VehicleType } from "@/lib/database.types";

export interface ListingFormValues {
  vehicle_type: VehicleType;
  // explicit browser-form values stay strings
}
```

**Pure mapping and validation pattern** (lines 33-80):

```ts
export function listingToForm(listing: Listing): ListingFormValues { /* ... */ }

export function validateListing(values: ListingFormValues): Record<string, string> {
  const errors: Record<string, string> = {};
  // collect field-specific plain-language errors, then return them
  return errors;
}
```

Create pure, testable exports for parsed settings, source/canonical validation, ordered-image cover selection, placeholder fallback, and metadata mapping. The module may import JSON and database types, but must not import React or Supabase Storage. Remove the legacy `image_url` validation/payload mapping at lines 76-98 when image metadata becomes the sole media source.

### `src/lib/image-normalizer.client.ts` (utility, file-I/O + transform)

**Analog:** None. Follow the research-owned client pipeline, not a component implementation.

Use an explicit client-only boundary (the `.client.ts` filename plus browser APIs), return a canonical `File` or typed per-file error, and keep decode/resize/quality-loop logic out of `listing-image-manager.tsx`. It consumes rules parsed from `listing-images.ts`; it must validate the post-encode WebP MIME and byte count. HEIC decoding is a dynamically imported, human-reviewed dependency checkpoint from research, not an unconditional package install.

### `src/lib/storage/listing-image-storage.ts` (service/contract, file-I/O + request-response)

**Analog:** [`src/lib/supabase.ts`](../../../src/lib/supabase.ts#L1) is the closest existing infrastructure boundary, although no provider-neutral contract exists yet.

**Boundary pattern** (lines 3-25):

```ts
let browserClient: SupabaseClient | undefined;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient;
  // validate environment once, construct, cache, return
}
```

Define the application-owned `ListingImageStorage` interface and its factory here, using opaque `storageKey` and `publicUrl` return values. Do not expose a bucket, a Supabase type, path construction, or Storage SDK method in this public contract. This is the future R2 swap seam.

### `src/lib/storage/supabase-listing-images.ts` (infrastructure adapter, file-I/O + request-response)

**Analog:** [`src/lib/supabase.ts`](../../../src/lib/supabase.ts#L1-L26)

**Imports and singleton client pattern** (lines 1-25):

```ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient | undefined;
```

The adapter is the only application file allowed to import the browser client for `supabase.storage`, define the `listing-images` bucket, create `sellerId/listingId/random.webp` keys, derive public URLs, or translate raw Storage errors. Use `upload(..., { cacheControl, contentType, upsert: false })`, check errors, and return only contract data. Implement compensating deletion when metadata registration fails in the domain orchestration; never manipulate `storage.objects` through SQL.

### `src/components/listing-image-manager.tsx` (component, file-I/O + event-driven)

**Analog:** [`src/components/listing-form.tsx`](../../../src/components/listing-form.tsx#L1-L179)

**Client component/import pattern** (lines 1-14):

```tsx
"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { useAuth } from "@/components/auth-provider";
```

**Independent pending/error state pattern** (lines 26-36, 39-67):

```tsx
const [errors, setErrors] = useState<Record<string, string>>({});
const [pending, setPending] = useState(false);
const [submitError, setSubmitError] = useState<string | null>(null);

if (result.error) {
  setSubmitError(result.error.message);
  setPending(false);
  return;
}
```

Give every selected file/tile its own state rather than reusing the whole listing form's `pending`. Translate adapter failures to the UI-SPEC copy, preserve successful/previous tiles, use `aria-live="polite"` for progress/success and `role="alert"` for errors. The component receives `listing`, `ownerId`, existing ordered images, and an app service/contract; it never imports Supabase or provider details.

### `src/components/listing-form.tsx` (component, CRUD + request-response)

**Analog:** [`src/components/listing-form.tsx`](../../../src/components/listing-form.tsx#L20-L68)

**Owner-scoped mutation pattern** (lines 39-67):

```tsx
const payload = toListingPayload(values, user.id);
const result = listing
  ? await supabase.from("listings").update({ ...payload, status: listing.status })
      .eq("id", listing.id).eq("seller_id", user.id).select("id").single()
  : await supabase.from("listings").insert(payload).select("id").single();

if (result.error) {
  setSubmitError(result.error.message);
  setPending(false);
  return;
}
router.push("/my-listings");
```

Keep listing field persistence as-is but remove the Image URL input at lines 133-138. On creation, route to the just-created listing edit route so the persisted image manager can be used; on editing, render `ListingImageManager` beside the form without coupling it to unsaved text state. Image work must not go through this component's listing update call.

### `src/components/listing-card.tsx` (component, request-response)

**Analog:** [`src/components/listing-card.tsx`](../../../src/components/listing-card.tsx#L7-L19)

**Image fallback pattern** (lines 7-19):

```tsx
const [imageSrc, setImageSrc] = useState(listing.image_url || "/vehicle-placeholder.svg");
<img
  src={imageSrc}
  alt={listing.image_url ? `${listing.make} ${listing.model}` : "Stock two-wheeler illustration"}
  className="listing-image"
  onError={() => setImageSrc("/vehicle-placeholder.svg")}
/>
```

Retain the stateful same-frame fallback, but derive `imageSrc` from the first explicitly ordered `listing_images` row through the domain helper. Real-image alt text becomes `{make} {model} — photo 1`; placeholder text remains exact. Do not read `image_url`, build URLs, or expose storage implementation details.

### `src/components/my-listing-card.tsx` (component, CRUD + request-response)

**Analog:** [`src/components/my-listing-card.tsx`](../../../src/components/my-listing-card.tsx#L19-L39)

**Destructive mutation pattern** (lines 19-38):

```tsx
const confirmed = window.confirm("Delete listing? ...");
if (!confirmed) return;
setPending(true);
setError(null);
// scoped mutation
if (updateError) setError(updateError.message);
else onDeleted(listing.id);
setPending(false);
```

Replace the direct soft-delete-only update at lines 27-31 with protected image cleanup orchestration: delete real objects through the storage contract, then image metadata, then update the existing listing to `status: "deleted"` through the authorized server path; on any object-delete failure leave the active listing and metadata intact. Preserve the confirmation, disabled controls, retryable alert, and `onDeleted` callback; after successful soft deletion remove the row from local state because it is no longer eligible for the owner-listing view.

### Query consumers: `src/components/listings-feed.tsx`, `src/app/my-listings/page.tsx`, `src/app/listings/[id]/edit/page.tsx` (components/pages, CRUD + request-response)

**Analogs:** [`src/components/listings-feed.tsx`](../../../src/components/listings-feed.tsx#L14-L29), [`src/app/my-listings/page.tsx`](../../../src/app/my-listings/page.tsx#L17-L28), and [`src/app/listings/[id]/edit/page.tsx`](../../../src/app/listings/[id]/edit/page.tsx#L19-L31)

**Async query and plain-language state pattern:**

```tsx
setLoading(true);
setError(null);
const { data, error: queryError } = await getSupabaseBrowserClient()
  .from("listings").select("*")
  .eq("status", "active")
  .order("created_at", { ascending: false });
if (queryError) setError(queryError.message);
else setListings((data ?? []) as Listing[]);
setLoading(false);
```

Extend every relevant listing select to include the ordered `listing_images` relation, mapping rows to `Listing` only at the query boundary. Keep loading, error, retry, and empty views unchanged. In My Listings, successful protected cleanup filters the soft-deleted row out of local state after the server reports status `deleted`. The edit query supplies current ordered photos to the image manager through `ListingForm`.

### `src/lib/listings.ts` and `src/lib/database.types.ts` (utility/model, CRUD + transform)

**Analogs:** [`src/lib/listings.ts`](../../../src/lib/listings.ts#L3-L100) and [`src/lib/database.types.ts`](../../../src/lib/database.types.ts#L1-L34)

**Type/mapping pattern:** define explicit application interfaces and narrow unions; do not pass untyped Supabase relation results beyond the query boundary. Add `ListingImage` with ID, `listing_id`, opaque storage key/public URL, `sort_order`, and timestamps; add an ordered `images: ListingImage[]` relation to `Listing`. Remove `image_url` from the form and Listing model once the migration eliminates it.

### `src/app/globals.css` (stylesheet, event-driven)

**Analog:** [`src/app/globals.css`](../../../src/app/globals.css#L307-L356) and its responsive rules at lines 361-384.

Reuse the existing `.button`, `.text-button.destructive`, label/input focus treatment, `.field-hint`, `.field-error`, `.form-alert`, and `.listing-form` styles. Add only scoped photo-manager classes: 4:3 `object-fit: cover` tiles, responsive 1/2/3-column grid, 44px remove targets, wrapping filenames, pending status, and the existing 600px breakpoint. Preserve the existing reduced-motion rule instead of adding animated progress effects.

### `supabase/migrations/<phase6>_listing_images.sql` (migration, CRUD + file-I/O)

**Analog:** [`supabase/migrations/20260730170000_create_mvp_schema.sql`](../../../supabase/migrations/20260730170000_create_mvp_schema.sql#L39-L196)

**Schema / RLS pattern** (lines 39-99, 131-196):

```sql
create table public.listings (
  id uuid primary key default extensions.gen_random_uuid(),
  seller_id uuid not null references auth.users (id) on delete cascade,
  -- check constraints and timestamps
);

alter table public.listings enable row level security;
revoke all on table public.listings from anon, authenticated;
grant select on table public.listings to anon, authenticated;
grant insert, update on table public.listings to authenticated;

create policy "Owners can update their listings"
on public.listings for update to authenticated
using ((select auth.uid()) = seller_id)
with check ((select auth.uid()) = seller_id);
```

Create a new forward-only migration—never edit the already-applied MVP migration. Add `listing_images` with a foreign key, unique `(listing_id, sort_order)`, canonical MIME/size metadata as needed, RLS public active-listing reads plus owner writes, and a database-owned count/order guard. Create the public bucket with canonical MIME/byte limits plus Storage `INSERT`/`SELECT` policies that enforce bucket, seller key-prefix, and owner listing relationship; permanent object deletion remains in protected server cleanup. Remove the legacy `listings.image_url` column in this migration only after confirming there is no production data requiring migration. The protected cleanup path must remove actual object bytes through the adapter, delete metadata, then set the existing listing row to deleted status rather than remove that row.

### `src/lib/listing-images.test.ts` and `src/lib/listing-image-storage.test.ts` (tests, transform + file-I/O)

**Analog:** [`src/lib/listings.test.ts`](../../../src/lib/listings.test.ts#L1-L54)

**Test pattern:**

```ts
import { describe, expect, it } from "vitest";
import { emptyListingForm, validateListing } from "./listings";

describe("listing form contract", () => {
  it("accepts ...", () => {
    expect(validateListing(/* fixture */)).toEqual({});
  });
});
```

Use focused fixture-driven unit tests: parse initial JSON values, per-file rejection without mutation, canonical cap/mime validation, first ordered image or placeholder selection, and mocked contract compensation behavior. Keep actual Supabase bucket/RLS/HEIC behavior as a hosted/manual smoke checklist, as research requires.

## Shared Patterns

### Authentication and owner scoping

**Sources:** [`src/components/listing-form.tsx`](../../../src/components/listing-form.tsx#L20-L59), [`src/components/my-listing-card.tsx`](../../../src/components/my-listing-card.tsx#L15-L31), and [`supabase/migrations/20260730170000_create_mvp_schema.sql`](../../../supabase/migrations/20260730170000_create_mvp_schema.sql#L170-L196)

Client components obtain `user` from `useAuth()` and scope writes with both `listing.id` and `user.id`; database/Storage RLS remains authoritative. New storage policies must use the same `auth.uid() = seller_id` principle and never trust a client-supplied seller ID alone.

### Pending, errors, and accessibility

**Sources:** [`src/components/listing-form.tsx`](../../../src/components/listing-form.tsx#L26-L67), [`src/components/listings-feed.tsx`](../../../src/components/listings-feed.tsx#L36-L63), [`src/app/globals.css`](../../../src/app/globals.css#L307-L348)

Set pending before an async operation, clear the relevant error first, return early on failure, and present a plain-language alert. Image actions refine this pattern to per-file/per-tile state so unrelated form fields and photos remain interactive. Use `role="alert"` for failures, `aria-live="polite"` for normal progress/success, accessible file-input labels, and the existing focus/radius/color tokens.

### Data and query mapping

**Sources:** [`src/components/listings-feed.tsx`](../../../src/components/listings-feed.tsx#L14-L29), [`src/app/listings/[id]/edit/page.tsx`](../../../src/app/listings/[id]/edit/page.tsx#L19-L31)

All current listing reads query in client components and cast results once to `Listing`. Phase 6 queries must select ordered image rows everywhere a card, owner deletion flow, or edit manager needs them; encapsulate relation ordering/mapping in `listing-images.ts` as far as Supabase's relation syntax permits.

## No Analog Found

| File | Role | Data Flow | Reason |
|---|---|---|---|
| `src/config/app-settings.json` | config | transform | No static application-settings pattern exists. |
| `src/lib/image-normalizer.client.ts` | utility | file-I/O, transform | No file/image processing exists. |
| `src/lib/storage/listing-image-storage.ts` | service contract | file-I/O | No provider-neutral storage abstraction exists. |
| `src/lib/storage/supabase-listing-images.ts` | infrastructure adapter | file-I/O | Existing Supabase boundary covers database client construction, not Storage operations. |
| `src/components/listing-image-manager.tsx` | component | file-I/O, event-driven | No file-picker/progress/thumbnail component exists. |

## Metadata

**Analog search scope:** `src/components`, `src/lib`, `src/app`, `supabase/migrations`, root configuration  
**Files scanned:** 15  
**Pattern extraction date:** 2026-08-01
