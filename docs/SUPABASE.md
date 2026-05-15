# Supabase Setup

Open Waitlist uses Supabase Postgres as the source of truth. The browser does not write directly to Supabase. Next.js API routes use the server-side key.

## 1. Create A Project

Create a Supabase project and wait for the database to finish provisioning.

## 2. Run The Schema

Open **SQL Editor** and run:

```sql
-- paste contents of supabase/schema.sql
```

The schema creates:

- `private.waitlist_rate_limits` table for durable rate limiting
- `waitlist` table
- indexes for email, verification token, referral code, position, and dynamic rank lookups
- `updated_at` trigger
- `check_waitlist_rate_limit(rate_bucket text, rate_identifier text, max_attempts integer, window_seconds integer)` rate-limit function
- `waitlist_rank_for_code(ref_code text)` rank lookup function
- `verify_waitlist_signup(token uuid)` verification/referral transaction function
- row-level security enabled

## 3. Copy API Values

Go to **Project Settings -> API** and copy:

- Project URL -> `NEXT_PUBLIC_SUPABASE_URL`
- Publishable key -> `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
- Secret/service role key -> `SUPABASE_SECRET_KEY`

Example:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-server-side-secret-key"
```

## 4. Why No Public Insert Policy?

The default setup keeps writes behind the app API. This means visitors submit to:

```text
POST /api/waitlist
```

Then the server writes to Supabase using the server-side key.

This keeps the schema simpler and avoids giving anonymous browser clients direct database write access.

## 5. How Ranking Works

The `position` column stores original signup order. Public waitlist rank is computed dynamically:

1. More verified referrals rank higher.
2. Ties go to the earlier signup.
3. Remaining ties use the row id for stable ordering.

The API uses `waitlist_rank_for_code(ref_code text)` instead of subtracting referral count from signup position.

## 6. Atomic Verification

The verification route calls `verify_waitlist_signup(token uuid)`. That function locks the signup row, marks it verified, increments the verified referrer's `referral_count`, and returns the updated ranks in one database transaction.

This prevents double-clicks or repeated verification links from awarding referral credit more than once.

## 7. Smoke Test

After configuring `.env.local`, run:

```bash
npm run dev
```

Submit an email. If the database is configured correctly, a row should appear in Supabase with:

- `verified = false`
- a generated `verification_token`
- a generated `referral_code`
- a numeric `position`

After clicking the verification email, `verified` should become `true`.

If the signup used a referral code, the referrer's `referral_count` should increase only once, even if the verification link is opened more than once.

## 8. Viewing And Exporting Signups

Open Waitlist does not include an admin dashboard yet. Supabase is the admin view.

To view signups:

1. Open your Supabase project.
2. Go to **Table Editor**.
3. Select the `waitlist` table.
4. Filter or sort by `verified`, `created_at`, `referral_count`, or `position`.

Confirmed users:

```sql
select
  email,
  referral_code,
  referred_by,
  referral_count,
  created_at
from public.waitlist
where verified = true
order by created_at asc;
```

Users ordered by public rank:

```sql
select
  email,
  referral_code,
  referral_count,
  created_at,
  row_number() over (
    order by referral_count desc, created_at asc, id asc
  ) as rank
from public.waitlist
where verified = true;
```

Unverified users who may need a resend or cleanup:

```sql
select
  email,
  created_at,
  updated_at
from public.waitlist
where verified = false
order by created_at desc;
```

To export, run a query in Supabase SQL Editor and choose **Download CSV** from the results toolbar.
