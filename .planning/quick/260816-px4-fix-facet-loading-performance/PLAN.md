---
status: complete
---

# Fix facet loading performance

Cache public listing facets per browser session for five minutes, deduplicate concurrent requests, and order paginated facet reads deterministically.

## Verification

- Existing unit tests pass.
- Typecheck, production build, and diff checks pass.
