# Revvbase

Revvbase is a responsive marketplace MVP for second-hand motorcycles, scooters, electric two-wheelers, and bicycles in India. Visitors can browse without signing in; one email/password account can both browse and publish listings.

## Stack

- Next.js App Router, React, and TypeScript
- Supabase PostgreSQL, Auth, Data API, and Row Level Security
- Vitest for focused listing-contract tests
- Vercel-compatible production build

The historical `backend/` FastAPI tree is retained as legacy context but is not part of the active MVP runtime.

## Hosting status

The web application is intentionally not deployed yet. The MVP runs locally against the hosted Supabase project; production hosting and production Auth origins are deferred until explicitly resumed.

## Local setup

Requires Node.js 20.9 or newer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Set these browser-safe variables in `.env.local`:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_your_key
```

Never put the Supabase service-role/secret key or database password in a `NEXT_PUBLIC_*` variable.

## Database

The canonical hosted schema is in `supabase/migrations/`; reference vehicle data is in `supabase/seed.sql`.

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push --include-seed
supabase db query --linked --file supabase/tests/rls.sql
```

## Release checks

```bash
npm run typecheck
npm test
npm run build
npm audit
supabase migration list
supabase db advisors --linked --type security
supabase db advisors --linked --type performance
```

The hosted end-to-end script creates temporary users and data, verifies Auth/CRUD/RLS, and removes them automatically. Supply privileged values only through the process environment:

```bash
SUPABASE_URL=... \
SUPABASE_PUBLISHABLE_KEY=... \
SUPABASE_SECRET_KEY=... \
node scripts/verify-hosted-mvp.mjs
```

`scripts/seed-demo.mjs` creates deterministic synthetic launch inventory. It stores no password or service key in the repository.
