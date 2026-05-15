# FAQ

## Can I use my own frontend?

Yes. Deploy Open Waitlist as the backend and call its API from your site. See [`OWN_FRONTEND.md`](./OWN_FRONTEND.md).

## Does Open Waitlist include an admin dashboard?

Not yet. Supabase is the admin view for now. Open your project, go to **Table Editor**, and open the `waitlist` table.

## How do I view or export waitlisted users?

Use Supabase Table Editor for quick viewing. For exports, run a query in SQL Editor and choose **Download CSV** from the results toolbar. See [`SUPABASE.md`](./SUPABASE.md#8-viewing-and-exporting-signups).

## How does ranking work?

Rank is computed dynamically:

1. More verified referrals rank higher.
2. Ties go to the earlier signup.
3. Remaining ties use the row id for stable ordering.

The original `position` column is only the signup order.

## When does a referral count?

A referral counts only after the referred user verifies their email.

## What happens if someone signs up twice?

If they are unverified, Open Waitlist sends a fresh verification email. If they are already verified, the API returns a friendly already-verified response.

## Can I disable bot protection?

Yes:

```bash
WAITLIST_BOT_PROTECTION_ENABLED="false"
```

For production launches, keeping it enabled is recommended.

## Does rate limiting work on serverless deployments?

Yes. Rate limits are stored in Supabase through `check_waitlist_rate_limit`, with an in-memory fallback if the database check fails.

## Can I test locally without Supabase or Resend?

You can view and edit the UI locally without provider keys. The real signup, verification, referral, and ranking flow needs Supabase and Resend.

## Which Supabase key should I use?

Use the publishable key for `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Use the service role or secret key only for `SUPABASE_SECRET_KEY`, which must stay server-side.

## Can I run multiple waitlists from one deployment?

Not yet. The current version is designed for one waitlist per deployment.

## Can I customize emails?

Basic branding is controlled by environment variables such as `NEXT_PUBLIC_APP_NAME`, `WAITLIST_FROM_EMAIL`, `WAITLIST_REPLY_TO`, and `WAITLIST_EMAIL_FOOTER`. Full email template customization is planned later.
