# Phase 1: Foundation - Discussion Log

> **Audit trail only.** Do not use as input to planning, research, or execution agents.
> Decisions are captured in CONTEXT.md — this log preserves the alternatives considered.

**Date:** 2026-05-04
**Phase:** 1-Foundation
**Areas discussed:** Repo & folder structure, Navigation shell, DB schema scope, Design token loading

---

## Repo & Folder Structure

| Option | Description | Selected |
|--------|-------------|----------|
| /frontend + /backend | Simple, clear split | ✓ |
| /apps/mobile + /apps/api | Apps-first, easier to add more services | |
| /client + /server | Classic naming, less descriptive | |

**User's choice:** /frontend + /backend

---

| Option | Description | Selected |
|--------|-------------|----------|
| By domain | auth/, listings/, users/ each with routes.py, models.py, schemas.py | ✓ |
| By layer | All routers together, all models together | |
| Flat | Single files for small apps | |

**User's choice:** Domain-driven backend structure

---

## Navigation Shell

| Option | Description | Selected |
|--------|-------------|----------|
| Home + Create + Profile | 3 tabs covering all MVP flows | ✓ |
| Home + Profile only | Create via floating button | |
| Home + Search + Create + Profile | 4 tabs, Search is v2 scope | |

**User's choice:** Home + Create + Profile (3 tabs)

---

| Option | Description | Selected |
|--------|-------------|----------|
| Redirect to Login screen | Navigate to OTP flow, return after login | |
| Show modal prompt | Bottom sheet, user stays on current screen | ✓ |
| Hide tabs from non-auth users | Create/Profile not visible until logged in | |

**User's choice:** Bottom sheet modal for auth-gated tabs

---

| Option | Description | Selected |
|--------|-------------|----------|
| Real tabs + placeholder screens | Navigator wired, each tab is an empty screen | ✓ |
| Tab structure only in code | Other tabs commented stubs | |
| Single screen scaffold | No tabs yet | |

**User's choice:** Real tabs with placeholder screens from Phase 1

---

## DB Schema Scope

| Option | Description | Selected |
|--------|-------------|----------|
| users | Phone, verified, created_at | ✓ |
| listings | Full listings table with PostGIS, JSONB | ✓ |
| listing_photos | Separate table with sort_order | ✓ |
| vehicle_makes | Reference data for makes/models | ✓ |

**User's choice:** All 4 tables in migration 001

---

| Option | Description | Selected |
|--------|-------------|----------|
| INTEGER in rupees | Simple, no paise needed | ✓ |
| INTEGER in paise | Standard financial but unnecessary complexity | |
| NUMERIC(12,2) | Decimal, float comparison issues | |

**User's choice:** INTEGER in rupees

---

| Option | Description | Selected |
|--------|-------------|----------|
| Seed file with common Indian brands | Known brands as dropdown | |
| Free text fields | No reference table, inconsistent entries | |
| Seed file + free text fallback | Dropdown with "Other" free-text option | ✓ |

**User's choice:** Seed file with "Other" fallback to free text

---

| Option | Description | Selected |
|--------|-------------|----------|
| Phone number only for MVP | Masked phone as seller identity | |
| Optional display name field | Nullable column, seller sets later | ✓ |
| Required display name on signup | Extra step in OTP flow | |

**User's choice:** Optional display_name field (nullable) on users table

---

## Design Token Loading

| Option | Description | Selected |
|--------|-------------|----------|
| Single theme.ts constants file | Simple, no library | |
| StyleSheet constants per domain | Multiple files, same outcome | |
| Shopify Restyle or Tamagui | Full theming library, overhead | |

**User's choice (via Other):** Context-driven theme system with typed Theme interface, useTheme() hook, darkTheme + lightTheme objects — designed for easy toggle and full theme swaps

**Notes:** User explicitly wants: (1) dark/light mode toggle to be easy in future, (2) complete theme replacement should be trivial, (3) theming must NOT be rigid. This became a hard constraint — no hardcoded colors in components, only useTheme() results.

---

| Option | Description | Selected |
|--------|-------------|----------|
| expo-font + useFonts hook | Standard Expo pattern, blocks splash until loaded | ✓ |
| Embed font files in assets/ | Same pattern, offline reliable | |
| System font fallback only | Skip Space Grotesk for Phase 1 | |

**User's choice:** expo-font + useFonts with @expo-google-fonts/space-grotesk

---

## Claude's Discretion

- Railway service configuration (single service for MVP)
- Alembic migration naming convention
- Python dependency management tool (uv preferred)
- Expo bundle identifier (com.revvbase.app)

## Deferred Ideas

None — discussion stayed within Phase 1 scope.
