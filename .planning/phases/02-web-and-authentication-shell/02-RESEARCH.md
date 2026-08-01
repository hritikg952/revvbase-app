# Phase 2: Web and authentication shell - Research

**Researched:** 2026-07-30
**Status:** Complete

## Stack

- Next.js App Router with TypeScript on Node.js 20.9 or newer.
- React and React DOM versions selected by the current Next.js release.
- `@supabase/supabase-js` for browser Auth and Data API access.
- Plain CSS with shared custom properties to keep the MVP dependency surface small.
- ESLint for static analysis and Vitest for focused component/unit coverage.

## Authentication pattern

Create one browser client from the public URL and publishable key. Wrap the application with an Auth provider that performs an initial `getSession()` and subscribes to `onAuthStateChange`. Supabase browser clients persist sessions by default. UI route guards redirect unauthenticated users, while database authorization remains in RLS.

## Sources

- Next.js installation guidance: App Router, TypeScript, and Node.js 20.9 minimum.
- Supabase JavaScript Auth guidance: browser clients persist sessions and expose Auth through `supabase.auth`.
- Supabase security guidance: authenticated Data API requests carry the user's access token and are authorized by RLS.
