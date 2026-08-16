# Revvbase

Revvbase is a responsive marketplace MVP for second-hand motorcycles, scooters, electric two-wheelers, and bicycles in India. Visitors can browse vehicle cards and listing-detail pages without signing in; one email/password account can publish listings, manage photos, and negotiate with other users.

For the canonical human-and-agent startup procedure, see [START-HERE.md](./START-HERE.md).
For a plain-language explanation of the hosted backend and common Supabase tasks, see [docs/SUPABASE-GUIDE.md](./docs/SUPABASE-GUIDE.md).

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

## Supabase database and functions

The canonical hosted schema is in `supabase/migrations/`; reference vehicle data is in `supabase/seed.sql`.

```bash
supabase login
supabase link --project-ref your-project-ref
supabase db push --linked
supabase functions deploy listing-image-cleanup --project-ref your-project-ref
supabase functions deploy listing-image-cleanup-retry --project-ref your-project-ref
supabase db query --linked --file supabase/tests/rls.sql
```

Listing photos use the public `listing-images` bucket plus ordered `listing_images` metadata. The first successfully registered photo is the listing cover; the public feed and listing detail page both use that same ordered image set. The upload flow reserves cleanup before transfer and cancels that reservation only after registration, preventing a new photo from being removed before it can be displayed.

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

`scripts/verify-hosted-mvp.mjs` is retained as a historical Auth/listings harness. It still targets the earlier direct-`active` listing lifecycle, so do not use it as a release check until it is updated for draft creation and protected publication. Supply privileged values only through the process environment when working on that harness:

```bash
SUPABASE_URL=... \
SUPABASE_PUBLISHABLE_KEY=... \
SUPABASE_SECRET_KEY=... \
node scripts/verify-hosted-mvp.mjs
```

`scripts/seed-demo.mjs` is also retained as a legacy pre-image-contract helper. It must be updated before being used against the current schema; it stores no password or service key in the repository.
