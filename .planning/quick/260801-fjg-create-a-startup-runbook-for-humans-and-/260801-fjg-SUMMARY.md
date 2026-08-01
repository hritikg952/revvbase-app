---
quick_id: 260801-fjg
description: Create a startup runbook for humans and agents
status: complete
completed: 2026-08-01
implementation_commit: 00372ec
---

# Quick Task 260801-fjg Summary

Created `START-HERE.md` as the canonical startup procedure for humans and coding agents, then linked it prominently from `README.md`.

## Included

- Already-configured and first-time startup paths
- Safe Supabase environment handling
- Expected UI and core-loop checks
- Local production-build smoke testing without hosting
- Clear separation between app startup and database administration
- Troubleshooting for configuration, port, connectivity, Auth, and dependencies
- Agent and human handoff checklists

## Verification

- `npm run typecheck` passed.
- `git diff --check` passed.
- Referenced `.env.example` and `package-lock.json` exist.
- `.env.local` remains ignored by Git.
- The documented npm scripts match `package.json`.
