# Project Research Summary

**Project:** Revvbase — second-hand two-wheeler marketplace (India)
**Updated:** 2026-07-29
**Status:** Active summary for the web MVP

## Executive Summary

Revvbase should first validate a thin marketplace loop: public visitors browse active listings, users authenticate with email/password, and the same users can create and manage their own vehicle listings. A separate buyer/seller role model, seller dashboard, moderation system, messaging, sophisticated discovery, and trust features are deliberately deferred.

Supabase is the planned MVP backend because it combines hosted PostgreSQL, Auth, generated data access, and Row Level Security. The website can query public active listings directly and perform owner CRUD through `supabase-js`, provided RLS policies are treated as a mandatory security boundary. Railway and a custom FastAPI service are not required for this scope.

The existing FastAPI listing model is useful as a field reference, but it should be translated into a smaller reviewed Supabase schema rather than carried over wholesale. City/location should be stored now, while PostGIS radius search is deferred. Images are optional initially; the UI should use a stock placeholder, with Supabase Storage considered only when real image upload becomes necessary.

## Active research

- `ARCHITECTURE-MVP.md` — active system and data-flow direction.
- `STACK-MVP.md` — active technology choices.
- `ARCHITECTURE.md` and `STACK.md` — historical Expo/FastAPI/Railway research.
