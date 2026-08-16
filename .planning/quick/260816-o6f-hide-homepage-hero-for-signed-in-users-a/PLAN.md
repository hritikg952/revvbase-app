---
quick_id: 260816-o6f
slug: hide-homepage-hero-for-signed-in-users-a
status: complete
---

# Hide homepage hero for signed-in users

Update the homepage to use the existing auth context. Show the marketing hero only for signed-out users after session loading completes, while keeping the marketplace listings visible for everyone. Verify with the project typecheck.

## Tasks

- [x] Gate the hero section on auth state.
- [x] Run typecheck and record the result.

## Verification

- `npm run typecheck` passed.
- `npm test -- --run` passed (64 tests).
- `git diff --check` passed.
