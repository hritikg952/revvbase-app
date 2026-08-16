---
quick_id: 260816-o6f
slug: hide-homepage-hero-for-signed-in-users-a
status: complete
---

# Summary

Updated `src/app/page.tsx` to consume the existing auth context. The hero is now hidden while session state is loading and for signed-in users; signed-out users still see it. The listings section remains visible for all users.

## Verification

- `npm run typecheck`
- `npm test -- --run` — 64 tests passed
- `git diff --check`
