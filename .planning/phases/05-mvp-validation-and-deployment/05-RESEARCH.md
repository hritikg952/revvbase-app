# Phase 5: MVP validation - Research

**Researched:** 2026-07-30
**Status:** Complete

## Runtime approach

The Next.js application runs locally against the hosted Supabase project using two browser-safe values: `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. It does not need server secrets because Supabase Auth and RLS authorize browser requests.

## MVP validation

- Run local typecheck, unit tests, production build, and dependency audit.
- Verify remote migration parity and zero Supabase security/performance advisor findings.
- Run `scripts/verify-hosted-mvp.mjs` with privileged keys supplied only through process environment.
- Start the production-compatible local server and inspect signed-out and authenticated flows in representative desktop and mobile viewports.
- Keep the localhost Supabase Auth origin; do not configure a production origin while hosting is deferred.

## Cleanup

Hosted acceptance users and rows are temporary and removed by the verification script. Demo rows are synthetic and can remain as representative inventory. No deployment rollback is necessary because web hosting is out of scope.
