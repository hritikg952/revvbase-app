# Phase 1: Supabase foundation - Research

**Researched:** 2026-07-30
**Status:** Complete

## Recommended approach

- Use Supabase CLI-native `supabase/migrations` and `supabase/seed.sql` artifacts.
- Reference `auth.users(id)` directly for listing ownership; do not duplicate authentication identities.
- Use text columns plus CHECK constraints for the small MVP status/type vocabularies so future migrations can extend them without PostgreSQL enum replacement work.
- Implement soft deletion as `listings.status = 'deleted'`; omit a public hard-delete policy.
- Allow public reads only for active listings and catalog data. Add a separate owner read policy so owners can still see their deleted rows.
- Use `auth.uid()` in `INSERT`, `SELECT`, and `UPDATE` policies with both `USING` and `WITH CHECK` ownership constraints.
- Test policies on the hosted database by switching to Supabase database roles and supplying representative JWT claims inside transactions.

## Data contract

The MVP listing contract includes vehicle type, make, model, year, odometer, price in INR, city, fuel type, previous owners, insurance validity, optional description, optional image URL, status, ownership, and timestamps. Ordinary city storage keeps the schema ready for a later PostGIS migration without expanding this phase.

## Risks and mitigations

- **Policy bypass through owner reassignment:** `WITH CHECK (seller_id = auth.uid())` prevents moving a row to another owner.
- **Deleted rows leaking publicly:** the anonymous/authenticated public policy filters to `status = 'active'`.
- **Hard deletion losing auditability:** no `DELETE` policy is granted; application deletion is a status update.
- **Seed drift:** catalog rows use deterministic UUIDs and conflict-safe inserts.
- **Credential exposure:** migrations and tests contain no project secrets; privileged keys are never written to repository files.
