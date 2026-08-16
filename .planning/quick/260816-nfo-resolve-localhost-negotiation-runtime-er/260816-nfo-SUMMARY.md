# Resolve negotiation runtime errors

Applied migration `20260816080000_make_offer_decisions_reversible.sql` to the configured Supabase project. Hardened the inbox against missing schema fields, stale conversation IDs, and unhandled async errors; signed-out users now receive the proper sign-in state instead of an endless loading state.

Validation passed: `npm run typecheck`, `npm test`, `npm run build`, and fresh localhost navigation.
