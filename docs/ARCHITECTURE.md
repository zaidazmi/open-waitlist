# Architecture

Open Waitlist is a small full-stack Next.js app. The browser never writes directly to Supabase. Instead, the form talks to Next.js API routes, and those routes use the server-side Supabase key.

## Flow

1. Visitor submits an email on `/`.
2. `POST /api/waitlist` rate-limits the request, checks bot signals, validates the email, creates a waitlist row, and sends a verification email.
3. The user clicks `/api/waitlist/verify?token=...`.
4. The verify route calls `verify_waitlist_signup`, which marks the row verified and credits the referrer in one database transaction.
5. The RPC returns dynamic ranks for the verified user and optional referrer.
6. The user is redirected to `/waitlist/verified?code=...`.
7. The verified page fetches `/api/waitlist/position?code=...` to show the current rank and referral link.

## Data Model

The `waitlist` table stores:

- normalized email
- version string
- verification status and token
- referral code
- optional referred-by code
- referral count
- signup position, used as a stable tie-breaker
- timestamps

Public rank is computed with `waitlist_rank_for_code`, ordered by verified referral count, signup time, and id.

See [`../supabase/schema.sql`](../supabase/schema.sql).

## Email

Resend sends three plain-text transactional emails:

- verification email
- welcome email after verification
- referrer notification email when a referred signup verifies

Branding comes from environment variables in `.env.example`.

## Abuse Protection

Signup requests are protected by:

- Supabase-backed per-IP rate limiting
- Supabase-backed per-email resend rate limiting
- a honeypot field
- a minimum form-render-to-submit time

The bundled UI sends the required bot-protection fields automatically. Custom frontends should follow [`OWN_FRONTEND.md`](./OWN_FRONTEND.md).
