---
phase: 6
slug: listing-image-management
status: draft
shadcn_initialized: false
preset: none
created: 2026-08-01
---

# Phase 6 — UI Design Contract

> Visual and interaction contract for listing photo management. This extends the existing hand-authored CSS system; it does not introduce a new UI library.

---

## Design System

| Property | Value |
|----------|-------|
| Tool | none — existing manual CSS custom-property system |
| Preset | not applicable |
| Component library | none |
| Icon library | none; use text labels and native file-picker affordance in this phase |
| Font | `Geist`, `Avenir Next`, `Segoe UI`, system-ui, -apple-system, sans-serif |

**Existing-system rule:** reuse `--paper`, `--surface`, `--ink`, `--muted`, `--line`, `--accent`, `--accent-dark`, `--destructive`, `--success`, `--radius`, `.button`, `.text-button`, form-alert, and focus-ring patterns in `src/app/globals.css`. No shadcn gate is applicable: the project already has an established manual design system and this planning-only phase must not initialize a component library.

---

## Spacing Scale

Declared values (multiples of 4 only):

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Status-to-thumbnail spacing; compact inline labels |
| sm | 8px | Thumbnail-internal gaps; caption spacing |
| md | 16px | Default control and photo-row gaps |
| lg | 24px | Photo-section and thumbnail-grid gaps |
| xl | 32px | Photo-section separation inside the listing form |
| 2xl | 48px | State-panel padding where a photo manager cannot render |
| 3xl | 64px | Existing page-level spacing only |

Exceptions: Interactive controls retain the existing 46–48px minimum height; icon-like remove controls must have a 44px minimum pointer target even when their visible text is compact.

---

## Typography

Phase additions use these four sizes and two weights; existing page display styles remain unchanged.

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Helper/status metadata | 12px | 400 | 1.5 |
| Labels, buttons, errors | 14px | 700 | 1.5 |
| Body copy | 16px | 400 | 1.5 |
| Photo section heading | 20px | 700 | 1.2 |

Long file names must wrap at word boundaries inside their thumbnail caption; do not reduce the font size or allow them to overflow controls.

---

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | `#f7f3ea` (`--paper`) | Page background and low-emphasis upload well |
| Secondary (30%) | `#ffffff` (`--surface`) | Listing form, photo tiles, state panels |
| Accent (10%) | `#e85d24` (`--accent`) | Add-photos CTA, input focus ring, active upload progress only |
| Destructive | `#b42318` (`--destructive`) | Remove-photo action, invalid-file and permanent-delete errors only |

Accent reserved for: **Add photos** / photo-picker trigger, its keyboard focus treatment, and an in-flight upload progress indicator. It is not used for remove actions, thumbnail decoration, or routine helper copy. Use `--success` (`#16734a`) only for a completed-upload confirmation.

---

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | `Add photos` |
| Edit-form section title | `Photos` |
| Empty state heading | `No photos yet` |
| Optional empty state body | `Photos are optional. Add up to 5 photos to help buyers understand your vehicle.` |
| Required draft empty state body | `Add at least 1 photo to publish this listing. You can add up to 5 photos.` |
| Draft create notice | `Your listing is saved as a draft. Add photos to publish it.` when required; `Your listing is ready to publish without photos.` when optional |
| Final required-photo success | `Photo removed. Your listing is now a draft until you add a photo and publish it again.` |
| Capacity helper | `{count} of 5 photos added. The first photo is used as the cover.` |
| Processing status | `Preparing {fileName}…` then `Uploading {fileName}…` |
| Successful upload status | `{fileName} added.` |
| Too-many-files error | `You can add only {remaining} more photo(s) to this listing.` |
| Unsupported/corrupt error | `{fileName} could not be used. Choose a supported photo file.` |
| Oversize-after-processing error | `{fileName} could not be reduced to 1 MB. Choose a smaller or lower-resolution photo.` |
| Upload failure | `{fileName} could not be uploaded. Your existing photos were not changed. Try again.` |
| Delete failure | `Photo could not be removed. It is still on your listing. Try again.` |
| Image-load fallback | `Photo unavailable; showing the Revvbase stock placeholder.` |
| Destructive confirmation | `Remove photo`: `Remove this photo permanently? This cannot be undone.`  `Delete listing`: `Delete listing and all its photos permanently? This cannot be undone.` |

The displayed count, maximum, accepted formats, stored-size target, and required/draft publication copy derive from the versioned JSON application settings. The examples above reflect the initial configuration (optional, maximum 5, canonical 1 MB); implementation must not duplicate these values as UI literals. The protected server result remains authoritative if the deployed policy mirror differs from a stale client bundle.

---

## UI and Interaction Contract

### Placement and entry points

- Replace the legacy editable **Image URL** field with a **Photos** fieldset in `ListingForm`.
- A new, unsaved listing has no upload controls because photos must be attached to a persisted listing. Submission always saves a non-public draft first, then requests protected publication. With `images.required=false`, protected publication may make the zero-photo draft active; with `true`, it remains owner-visible draft and routes to the persisted edit/photo manager with required-photo copy.
- An existing listing renders the manager independently from text-field save state. Adding or removing a photo does not submit, reset, validate, or overwrite any unsaved listing fields.
- The manager starts with the empty state when no metadata rows exist. It renders an `Add photos` control and a visually adjacent helper that reports remaining capacity.

### Photo collection and cover behavior

- Display persisted photos as a responsive thumbnail grid: one column at narrow mobile widths, two columns from the existing form's two-column breakpoint upward, and no more than three thumbnails per row within the form.
- Each tile uses a 4:3 image frame with `object-fit: cover`, a neutral `--paper` fallback, an ordinal caption (`Photo 1`, `Photo 2`, …), and a `Remove photo` action. The first tile also has a noninteractive `Cover` label.
- Order is read-only and matches durable insertion order. No drag handles, reorder buttons, or selectable-cover UI may be rendered in this phase.
- Removing the first tile advances the next persisted image to the `Cover` label immediately after successful deletion. Removing the final tile returns to the documented empty state; if the listing was active and `images.required=true`, the protected result must instead show its new `draft` status and publish guidance before empty-state copy.
- The public listing card selects the first ordered photo as its 4:3 cover. If an active listing has no photos or the image load fails, it renders `/vehicle-placeholder.svg`; no broken-image affordance or arbitrary external URL is shown. Drafts never render in public cards/feeds, although the MVP's public object URLs may resolve if obtained outside the application.

### Add, validation, and progress

- `Add photos` opens an accessible native multi-file picker whose `accept` attribute is derived from configuration. A visually hidden file input must still have an associated accessible label.
- Allow selection only while capacity remains. At capacity, disable the add control and present the count helper; do not silently discard selected files.
- Treat each selected file as an independent operation. Show a tile-level queued/processing/uploading state in selection order, with the filename and a textual progress state. Use `aria-live="polite"` for normal progress and success; errors use `role="alert"`.
- Validate each file before any mutation. Invalid, corrupt, undecodable, unsupported, over-source-safety-limit, or over-canonical-size files receive their own message and no existing tile changes.
- Successful uploads replace only their own pending tile with the real image and `Cover` label as applicable. Failures remove only the pending tile and preserve already uploaded photos.
- The UI never exposes bucket names, object keys, provider names, provider URL construction, or provider-specific error text. Convert infrastructure errors to the copywriting contract above.

### Destructive operations and recovery

- `Remove photo` is always an explicit action and requires the documented confirmation before the permanent deletion call. Disable only that photo's remove control while it is deleting; all other photo controls remain usable unless a global capacity calculation requires otherwise.
- On a failed photo deletion, restore the tile to its prior ready state, keep its position and cover status, and show the documented retryable error.
- When protected final-photo deletion returns `draft`, show the final-photo success message and a clear owner-only `Add photos and publish` path. Do not claim the listing is still for sale or attempt a client status update.
- Listing deletion uses the existing confirmation interaction but must use the expanded permanent wording when its listing has photos. While deletion is in flight, disable its Edit/Delete controls and label the action `Deleting…`. On failure, leave the listing and all visible photo metadata intact and show the existing alert treatment with retry guidance.

### Responsive and accessible behavior

- Preserve the existing 600px form breakpoint and 820px shell breakpoint. The upload control is full-width below 600px; photo tiles never become narrower than 132px and wrap rather than overflow.
- Use meaningful alt text for a real cover: `{make} {model} — photo {n}`. The stock placeholder uses `Stock two-wheeler illustration`. Decorative status visuals have no duplicate screen-reader text.
- All controls are keyboard reachable and retain the existing orange 3px focus ring. Button labels identify their target when repeated: `Remove photo 2` rather than a bare `Remove` for assistive technology.
- Respect the existing reduced-motion media query: no looping or flashing upload animation; progress may update textually and with a static fill transition.

### Explicit non-goals

- No photo gallery, lightbox, zoom, detail-page interaction, caption/alt-text editing, drag-and-drop requirement, photo reordering, manual cover selection, signed-URL expiry UI, private draft staging/promotion UI, restore/trash state, or user-wide quota UI.

---

## UI Considerations

Applicable state considerations resolved: 12 covered, 2 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| empty | Photo manager media collection | ✅ covered | With zero rows, the manager shows `No photos yet`, setting-derived optional/required draft copy, and the `Add photos` control. |
| loading | Photo manager media collection | ✅ covered | Existing rows render before new file work; each selected file has a tile-level `Preparing…` / `Uploading…` state, avoiding a whole-form loading block. |
| error | Photo manager media collection; listing-card media | ✅ covered | Each failed file/deletion gets its documented per-file alert without changing existing photos; a failed cover load falls back to the stock placeholder. |
| populated | Photo manager media collection | ✅ covered | Persisted images render as ordered 4:3 thumbnail tiles, with `Cover` only on the first tile and a per-tile remove action. |
| partial | Photo manager form | ✅ covered | Concurrent outcomes are independent: successful tiles persist, failed pending tiles leave the collection unchanged, and unsaved text fields remain untouched. |
| overflow | Photo manager media collection | ✅ covered | Tiles wrap responsively; file names wrap in captions; the grid does not horizontal-scroll. |
| zero-one-many | Photo manager media collection | 🧪 backstop | Visual UI-state test covers zero photos, one cover tile, and five ordered tiles at desktop and mobile widths. |
| long-text | Photo manager form; interactive controls | 🧪 backstop | Long filenames wrap inside tiles and accessible remove labels retain their ordinal; no clipping of action text. |
| empty | Listing-card media | ✅ covered | An image-less listing uses the current stock placeholder and its documented alt text. |
| loading | Listing-card media | ✅ covered | The image frame keeps its 4:3 reserved area while the image resolves, preventing layout shift. |
| error | Listing-card media | ✅ covered | `onError` replaces the broken real image with the stock placeholder in the same reserved frame. |
| populated | Listing-card media | ✅ covered | The first ordered image is rendered as the card cover with vehicle-identifying alt text. |
| partial | Listing-form photo area | ✅ covered | New-listing submission creates a draft then shows the setting-specific publish outcome; edit listings show the active manager, and required final-photo removal returns to draft safely. |
| long-text | Static helper/error content | ✅ covered | Config-derived values and error messages wrap within the form and use the existing alert/error treatment. |
| overflow | Navigation | dismissed | This phase does not alter existing navigation; its horizontal-scroll responsive behavior remains the established implementation. |

---

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| shadcn official | none | not applicable — no shadcn initialization or registry use |
| third-party | none | not applicable |

---

## Checker Sign-Off

- [ ] Dimension 1 Copywriting: PASS
- [ ] Dimension 2 Visuals: PASS
- [ ] Dimension 3 Color: PASS
- [ ] Dimension 4 Typography: PASS
- [ ] Dimension 5 Spacing: PASS
- [ ] Dimension 6 Registry Safety: PASS

**Approval:** pending
