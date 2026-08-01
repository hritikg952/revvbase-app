---
phase: 01-supabase-foundation
plan: 01
subsystem: database
tags: [supabase, postgres, rls, migrations]
requires: []
provides:
  - Hosted MVP database schema and deterministic reference catalog
  - Anonymous active-read and authenticated owner-write RLS boundary
  - Transactional hosted RLS regression assertions
affects: [web-authentication-shell, seller-listing-crud, public-listings-feed]
tech-stack:
  added: [Supabase CLI, PostgreSQL Row Level Security]
  patterns: [auth.users ownership, soft deletion, hosted migration verification]
key-files:
  created:
    - supabase/migrations/20260730170000_create_mvp_schema.sql
    - supabase/migrations/20260730173000_harden_function_and_read_policies.sql
    - supabase/seed.sql
    - supabase/tests/rls.sql
  modified: [supabase/config.toml]
key-decisions:
  - "Use auth.users as the only identity source and listings.seller_id as the ownership boundary."
  - "Represent deletion as status='deleted' and grant no browser hard-delete capability."
  - "Keep PostGIS and image storage deferred while retaining city and optional image URL fields."
patterns-established:
  - "All public tables have explicit grants plus enabled RLS."
  - "Hosted database behavior is verified transactionally through Supabase CLI."
requirements-completed: [SEC-01, SEC-02, SEC-03]
coverage:
  - id: D1
    description: "Anonymous clients can read active marketplace data but cannot write."
    requirement: SEC-01
    verification:
      - kind: integration
        ref: "supabase db query --linked --file supabase/tests/rls.sql"
        status: pass
    human_judgment: false
  - id: D2
    description: "One authenticated owner cannot update another owner's listing."
    requirement: SEC-02
    verification:
      - kind: integration
        ref: "supabase db query --linked --file supabase/tests/rls.sql"
        status: pass
    human_judgment: false
  - id: D3
    description: "Repository and browser-facing configuration contain no service-role key."
    requirement: SEC-03
    verification:
      - kind: other
        ref: "repository credential scan and committed file review"
        status: pass
    human_judgment: false
duration: 35min
completed: 2026-07-30
status: complete
---

# Phase 1: Supabase foundation Summary

The hosted Revvbase project now has a reproducible database and verified authorization boundary.

## Accomplishments

- Applied two committed migrations and deterministic vehicle catalog seed data to `qokumaemcqwkqhrxyolc`.
- Verified anonymous reads/writes, owner soft deletion, and cross-owner isolation in a rolled-back hosted transaction.
- Resolved the database security/performance findings identified during schema work. Later Auth hardening recommendations are documented in Phase 5.

## Deviations from Plan

Added a follow-up hardening migration after the hosted advisors identified an executable security-definer function and overlapping read policies. The migration revoked RPC execution and consolidated authenticated reads without changing product behavior.

## Next Phase Readiness

The public Data API, Auth identity source, and RLS-protected listing tables are ready for the Next.js authentication shell.
