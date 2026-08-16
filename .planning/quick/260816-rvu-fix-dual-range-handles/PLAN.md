---
status: complete
---

# Fix dual-range handle interaction

Keep both handles on a fixed numeric scale and clamp attempted overlaps in the change handlers, so moving one thumb does not remap the other thumb's position.

## Verification

- Drag both price handles independently in localhost.
- Run tests, typecheck, build, and diff checks.
