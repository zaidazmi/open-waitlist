# Deployment

Open Waitlist is a standard Next.js app and works well on Vercel or any host that supports Next.js App Router API routes.

## Vercel

1. Import the repository into Vercel.
2. Add all required environment variables from `.env.example`.
3. Set `NEXT_PUBLIC_SITE_URL` to your production URL.
4. Deploy.

## Supabase

Run `supabase/schema.sql` in the SQL editor before testing the deployed app.

Use a server-side secret/service role key only in server environments. Do not prefix it with `NEXT_PUBLIC_`.

## Resend

Use a verified sender domain for production deliverability. Set:

- `RESEND_API_KEY`
- `WAITLIST_FROM_EMAIL`
- `WAITLIST_REPLY_TO`

## Post-Deployment Smoke Test

1. Submit a new email on the homepage.
2. Confirm the verification email arrives.
3. Click the verification link.
4. Confirm the verified page shows a position and referral link.
5. Use the referral link with a second email.
6. Verify the second email and confirm the first user's referral count changes.
