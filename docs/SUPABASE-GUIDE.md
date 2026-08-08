# Supabase guide for Revvbase

This guide explains the Supabase parts of Revvbase in everyday language. You do not need to be a database engineer to use it.

## What Supabase does here

Supabase is the hosted backend for Revvbase. It provides four things:

- **Database:** stores accounts, listings, image records, and settings.
- **Authentication:** handles sign-up, sign-in, and logged-in sessions.
- **Storage:** keeps the actual listing-photo files.
- **Security rules:** make sure visitors see only active listings and sellers can change only their own listings.

The website talks to Supabase using a browser-safe publishable key. The powerful service-role key stays on the server side and must never be added to the website's `.env.local` file or a `NEXT_PUBLIC_*` setting.

## The important project areas in the Dashboard

Open your Supabase project dashboard, then use these areas:

| Dashboard area | What it is for |
| --- | --- |
| Table Editor | Look at listings, image records, and app settings. |
| Authentication | View users and sign-in settings. |
| Storage | View the `listing-images` bucket and its photo files. |
| Edge Functions | View the protected image lifecycle functions and their logs. |
| SQL Editor | Run a reviewed SQL query when a release step calls for one. |
| Database → Migrations | Confirm that application migrations have been applied. |

## Keys: what is safe and what is not

### Safe in the website

Only these belong in `.env.local` for the Next.js app:

```dotenv
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your_publishable_key
```

### Never put these in the website

- Service-role or secret key
- Database password or database URL
- Any value copied from a Vault secret

Treat the service-role key like a master key: it can bypass normal user-facing security rules. Keep it only in Supabase Edge Function secrets or use it briefly in a trusted operator terminal.

## Listings and photos in simple terms

1. A seller creates a listing. It begins as a private **draft**.
2. The seller adds photos. The browser validates and optimizes a photo before uploading it.
3. Supabase Storage holds the photo file; the database stores its position and which listing owns it.
4. The first photo is the cover photo.
5. Publishing makes the listing visible to visitors when the image rule allows it.
6. Deleting a photo or listing removes its records and storage files permanently.

The current MVP allows up to five photos per listing and uses the settings file in `src/config/app-settings.json` for upload rules. Changing a rule there may also require a matching database migration; it is not enough to change browser validation alone.

## When photo cleanup needs attention

Most photo cleanup happens immediately. If Supabase Storage has a temporary problem, Revvbase records a durable cleanup job so it is not forgotten.

For now, retries are **manual**. Automatic five-minute scheduling with Supabase Vault and Cron is deliberately deferred.

An operator can run the retry function from a trusted terminal after it has been deployed:

```bash
curl -X POST \
  "https://YOUR_PROJECT_REF.supabase.co/functions/v1/listing-image-cleanup-retry" \
  -H "Authorization: Bearer YOUR_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" \
  -d '{}'
```

Do not run this command in a browser, paste its service key into a chat, or store the key in the repository. A successful response reports how many cleanup jobs were processed.

## Routine release checklist

Before deploying a Supabase-related change:

1. Run `npm test`, `npm run typecheck`, and `npm run build`.
2. Review the new file in `supabase/migrations/`.
3. Apply it only to the intended linked Supabase project.
4. Deploy any matching Edge Function changes.
5. Run the hosted verification harness.
6. Check Edge Function logs and Storage for unexpected errors.

## Later: automatic cleanup retries

When manual retries become inconvenient, add a scheduled call to `listing-image-cleanup-retry` using Supabase Vault, Cron, and `pg_net`. That change should be planned as a small hardening task, including a test that proves the schedule exists and can invoke the function. Until then, manual invocation is the intentional MVP operating model.
