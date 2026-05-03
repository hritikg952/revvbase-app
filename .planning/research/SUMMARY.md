# Project Research Summary

**Project:** Revvbase -- second-hand 2-wheeler marketplace (India)
**Domain:** Mobile-first consumer marketplace, India-specific
**Researched:** 2026-05-03
**Confidence:** MEDIUM-HIGH overall

## Executive Summary

Revvbase is a mobile-first classifieds marketplace narrowly focused on used 2-wheelers in India -- a gap that exists because OLX is generic and Cars24/Spinny ignore the segment. The correct build approach is a thin, high-quality supply-demand loop: OTP login (the Indian auth standard) to structured listing creation with mandatory photos to browsable paginated feed to full detail page with phone reveal. Every other feature is v2. The stack is well-matched: Expo New Architecture for the app, FastAPI + PostgreSQL on Railway for the backend, Cloudinary for images, MSG91 for OTP. All choices are validated, low-cost, and can scale past MVP without re-architecture.

The key architectural insight is that image upload must go mobile to Cloudinary directly (server-signed), never through the Railway backend. This single decision determines Railway cost, upload latency, and scalability. A second non-negotiable: the database schema must be PostGIS-ready and use JSONB for vehicle-type-specific attributes from migration 001 -- retrofitting after data exists is painful. The listings feed must use keyset cursor pagination (not offset) and ORM eager loading from the start; both are invisible bugs until traffic hits.

The critical security pitfall is OTP bombing: the /auth/send-otp endpoint with no rate limiting will be discovered and exploited, costing Rs10,000+ in MSG91 SMS credits overnight. Rate limiting via slowapi and a MSG91 spend cap must be in place before any public URL is accessible. Build the refresh token cycle at the same time as OTP auth; retrofitting it later requires simultaneous changes to the API client, auth state, and backend.

---

