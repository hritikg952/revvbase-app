# Start Revvbase locally

This is the canonical startup runbook for both humans and coding agents. Follow it from the repository root.

Revvbase is a Next.js application that connects directly to the existing hosted Supabase project. You do not need Docker, a local PostgreSQL server, or a local Supabase stack to start the app.

## Operating rules

- Start the app locally only. Do not deploy or configure a production URL unless the user explicitly resumes hosting.
- Never print, commit, or place a Supabase service-role key, secret key, database password, or access token in a browser variable.
- Browser configuration uses only `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- `.env.local` is intentionally ignored by Git. Do not add it to a commit.
- Do not change application code merely to make startup easier. Diagnose the startup problem first.
- The historical `backend/` directory is not part of the active MVP runtime.

## Quick start for an already configured checkout

From the repository root:

```bash
node --version
npm ci
npm run dev
```

Node.js must be version 20.9 or newer. When Next.js reports that it is ready, open:

```text
http://localhost:3000
```

Keep the terminal running while using the app. Stop it with `Ctrl+C`.

## First-time setup

### 1. Install prerequisites

Required:

- Node.js 20.9 or newer
- npm
- Internet access to the hosted Supabase project

Optional, only for database administration:

- Supabase CLI

Confirm the required tools:

```bash
node --version
npm --version
```

### 2. Install deterministic dependencies

```bash
npm ci
```

Use `npm ci` for a normal checkout because `package-lock.json` is committed. Use `npm install` only when intentionally changing dependencies.

### 3. Configure browser-safe Supabase values

If `.env.local` does not exist, create it from the template:

```bash
cp .env.example .env.local
```

Set both values in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

For this repository, the hosted project is `revvbase`, project ref `qokumaemcqwkqhrxyolc`, in `ap-south-1`. Use its project URL and publishable key. Do not use the service-role or secret key.

Check that the file exists without displaying its contents:

```bash
test -f .env.local
```

Agents must not echo, copy into chat, or otherwise expose `.env.local`. If it is missing and the safe values cannot be discovered without exposing credentials, stop and ask the user to configure it.

### 4. Start the development server

```bash
npm run dev
```

Expected terminal output includes a local URL and a ready message. Open `http://localhost:3000`.

## Confirm the app is working

The signed-out home page should show:

- The Revvbase header and marketplace hero
- Four synthetic demo listing cards
- Royal Enfield Classic 350, Honda Activa 6G, Ather 450X, and Firefox Bad Attitude 8
- Sign-in and Sell controls

Then verify the core loop when needed:

1. Create an email/password test account or sign in with an existing test account.
2. Reload the page and confirm the session remains signed in.
3. Open Sell and create a synthetic listing.
4. Open My listings and edit it.
5. Sign out and confirm the active listing appears publicly.
6. Remove temporary test data when validation is finished.

Use synthetic test information only. Do not alter a real user's account or listing.

## Quality checks

Run these before handing off code changes:

```bash
npm run typecheck
npm test
npm run build
npm audit --audit-level=moderate
```

Expected results:

- TypeScript exits successfully.
- Vitest reports four passing tests.
- Next.js builds `/`, `/auth`, `/sell`, `/my-listings`, and `/listings/[id]/edit`.
- npm reports zero known vulnerabilities at the selected audit level.

## Production-build smoke test without hosting

This remains local and does not deploy anything:

```bash
npm run build
npm run start
```

Open `http://localhost:3000`, perform the required smoke check, and stop the server with `Ctrl+C`.

## Database checks are separate from app startup

The app starts without running Supabase migrations or seeds. Only run database commands when schema, seed, or RLS work is in scope.

Read-only or transactional verification commands:

```bash
supabase migration list --linked
supabase db query --linked --file supabase/tests/rls.sql
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
```

Do not run `supabase db push`, reseed data, rotate keys, or change Auth configuration merely to start the app.

## Troubleshooting

### Supabase configuration is missing

Symptom:

```text
Supabase browser configuration is missing
```

Action: confirm `.env.local` exists and contains both browser-safe variables, then restart Next.js. Environment changes are not picked up reliably by an already running process.

### Port 3000 is already in use

Find the listener:

```bash
lsof -nP -iTCP:3000 -sTCP:LISTEN
```

Do not terminate an unfamiliar process without the owner's approval. Stop the known Revvbase process with `Ctrl+C`, then start it again. Prefer port 3000 because Supabase Auth is configured for the localhost origin.

### The page loads but listings do not

Check:

- Internet connectivity
- That `.env.local` points to project ref `qokumaemcqwkqhrxyolc`
- Browser developer-console errors
- Supabase project status

Do not replace the hosted project with a local Supabase instance as a startup workaround.

### Authentication fails

Confirm the app is running at `http://localhost:3000`, then retry with a valid email/password account. If testing repeated sign-ups, Supabase rate limits may require a short wait. Do not weaken Auth settings merely to bypass a transient test failure.

### Dependencies behave unexpectedly

Restore the lockfile-defined installation:

```bash
npm ci
```

Do not delete or regenerate `package-lock.json` unless dependency changes are intentional.

## Agent handoff checklist

Before an agent reports that the app is running:

- Read `AGENTS.md` and this runbook.
- Confirm the command ran from the repository root.
- Confirm `.env.local` exists without displaying it.
- Report the local URL and whether the process is still running.
- Report any background terminal/session identifier needed to stop or resume the process.
- Verify the home page, not only the terminal ready message.
- Stop the server before final handoff unless the user asked to keep it running.
- Do not deploy, push, rotate credentials, or mutate hosted database state without matching authorization.

## Human handoff checklist

Before reporting a startup problem, include:

- The command that failed
- The complete non-secret error message
- Node.js and npm versions
- Whether `.env.local` exists
- Whether port 3000 is already in use

Never paste `.env.local`, database passwords, access tokens, or Supabase secret/service-role keys into an issue or chat.
