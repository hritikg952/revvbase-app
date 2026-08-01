---
phase: 2
slug: web-and-authentication-shell
status: approved
shadcn_initialized: false
preset: none
created: 2026-07-30
---

# Phase 2 — UI Design Contract

## Design System

| Property | Value |
|----------|-------|
| Tool | none — purpose-built CSS components |
| Preset | not applicable |
| Component library | none |
| Icon library | inline accessible text/symbols; no icon dependency in the shell |
| Font | Geist Sans with system sans-serif fallback |

## Spacing Scale

| Token | Value | Usage |
|-------|-------|-------|
| xs | 4px | Inline micro-gaps |
| sm | 8px | Compact controls |
| md | 16px | Default control/card spacing |
| lg | 24px | Section padding |
| xl | 32px | Layout gaps |
| 2xl | 48px | Major sections |
| 3xl | 64px | Desktop page rhythm |

Exceptions: none.

## Typography

| Role | Size | Weight | Line Height |
|------|------|--------|-------------|
| Body | 16px | 400 | 1.6 |
| Label | 14px | 650 | 1.4 |
| Heading | clamp(28px, 4vw, 44px) | 750 | 1.1 |
| Display | clamp(40px, 7vw, 76px) | 800 | 0.98 |

## Color

| Role | Value | Usage |
|------|-------|-------|
| Dominant (60%) | #F7F3EA | Page background |
| Secondary (30%) | #FFFFFF / #1D2A24 | Cards and dark header/hero surfaces |
| Accent (10%) | #E85D24 | Primary CTA, selected mode, focus accents |
| Destructive | #B42318 | Destructive actions and errors only |

Accent reserved for primary calls to action, selected auth mode, and focus indicators.

## Copywriting Contract

| Element | Copy |
|---------|------|
| Primary CTA | Sell your two-wheeler |
| Sign-in heading | Welcome back |
| Sign-up heading | Create your Revvbase account |
| Auth error | We couldn't complete that request. Check your details and try again. |
| Session loading | Checking your session… |

## UI Considerations

Applicable state considerations resolved: 5 covered, 0 backstop, 0 unresolved.

| Category | Element(s) | Status | Resolution / Reason |
|----------|------------|--------|---------------------|
| loading | Auth provider and auth form | ✅ covered | Session and submission loading states are visibly distinct and controls are disabled during requests. |
| error | Auth form | ✅ covered | Errors render next to the form with recovery guidance and remain announced to assistive technology. |
| authenticated | Header | ✅ covered | Signed-in users see Sell, My listings, and Sign out without losing public browsing. |
| unauthenticated | Header | ✅ covered | Signed-out users see Browse and Sign in while the marketplace remains public. |
| narrow viewport | Header and auth card | ✅ covered | Navigation wraps cleanly and the auth card uses full available width without horizontal scrolling. |

## Registry Safety

| Registry | Blocks Used | Safety Gate |
|----------|-------------|-------------|
| none | none | not required |

## Checker Sign-Off

- [x] Dimension 1 Copywriting: PASS
- [x] Dimension 2 Visuals: PASS
- [x] Dimension 3 Color: PASS
- [x] Dimension 4 Typography: PASS
- [x] Dimension 5 Spacing: PASS
- [x] Dimension 6 Registry Safety: PASS

**Approval:** approved 2026-07-30
