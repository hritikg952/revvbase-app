# Phase 6: Listing image management - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-08-01
**Phase:** 06-listing-image-management
**Areas discussed:** upload rules, media optimization, public delivery, lifecycle, application configuration

---

## Upload rules

| Option | Description | Selected |
|---|---|---|
| Five images per listing | Small, focused MVP gallery capacity. | ✓ |
| Images optional | Permit a listing with no images and show the placeholder. | ✓ |
| Per-user quota | Limit all images owned by a seller. | |

**User's choice:** Five images per listing; images remain optional for now; limits are per listing only.
**Notes:** Whether images are required must be configurable rather than hard-coded. The initial source-format intent is broad user-photo support, including iPhone images.

---

## Media optimization

| Option | Description | Selected |
|---|---|---|
| Preserve uploaded originals | Retain source files alongside derivatives. | |
| Store an optimized canonical image | Convert to browser-friendly WebP/JPEG, omit originals, and cap stored output. | ✓ |

**User's choice:** Accept the recommended optimized-only approach.
**Notes:** The stored canonical image is limited to 1 MB and should retain sufficient quality for future zoomable details.

---

## Public delivery

| Option | Description | Selected |
|---|---|---|
| Stable public CDN URL | Suitable for public marketplace vehicle photos and caching. | ✓ |
| Signed, expiring URL | More appropriate for private media and requires URL-refresh flows. | |

**User's choice:** Accept the recommended stable public URL approach.
**Notes:** Owner authorization remains mandatory for upload/delete even though active images are publicly viewable.

**MVP clarification (2026-08-01):** Use the selected public bucket and stable public object URLs for draft photos as well. The application still keeps draft listing records and image metadata owner-only and excludes drafts from public listing queries. Private draft staging with promotion to public delivery is deferred production hardening.

---

## Image behavior and lifecycle

| Option | Description | Selected |
|---|---|---|
| First upload is cover | Avoid a reorder control in this phase. | ✓ |
| Immediate add/delete | Image operations persist separately from listing text saves. | ✓ |
| Permanent cleanup | Remove image metadata and storage objects with no retention period. | ✓ |

**User's choice:** First image is the cover; owners can add/delete but not reorder; operations are immediate; image removal and listing deletion are permanent.
**Notes:** Validation failures must be per-file and must not disturb existing images.

---

## Application configuration

| Option | Description | Selected |
|---|---|---|
| Upload-only JSON rules | Versioned static config initially contains upload limits and related rules. | ✓ |
| Broad static-settings foundation | Schema is extendable across future application static values. | ✓ |
| Runtime production edit without deployment | Would need a separate trusted config-delivery system. | |

**User's choice:** An extensible application JSON configuration, initially limited to upload rules, with changes applied via rebuild/deployment.
**Notes:** The user agreed client configuration is not itself an authorization boundary.

---

## the agent's Discretion

- Exact storage interface, optimization tooling, database migration, format fallback behavior, dimensions, quality, config location/schema, and display-variant implementation.

## Deferred Ideas

- Image reordering and custom cover selection.
- Detail-page gallery and zoom UI.
- R2 provider implementation, private delivery, retention/recovery, per-user quotas, and advanced media features.
