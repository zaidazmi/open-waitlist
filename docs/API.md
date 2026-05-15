# API Reference

These endpoints can be used by the included frontend or by your own frontend.

## CORS

Set `WAITLIST_ALLOWED_ORIGINS` when calling the API from another domain:

```bash
WAITLIST_ALLOWED_ORIGINS="https://example.com,http://localhost:5173"
```

Use `*` only for experiments. For production, list exact origins.

## POST /api/waitlist

Creates an unverified waitlist entry and sends a verification email.

Request:

```json
{
  "email": "person@example.com",
  "referredBy": "abc123",
  "website": "",
  "submittedAt": 1778840000000
}
```

`referredBy` is optional. `website` is the default honeypot field and must stay empty. `submittedAt` should be the timestamp from when the form rendered.

Success response:

```json
{
  "success": true,
  "message": "Check your email to verify your spot!"
}
```

Example:

```ts
// Save this when the form renders, then send it from your submit handler.
const formRenderedAt = Date.now();

await fetch('https://your-backend.com/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    referredBy: new URLSearchParams(location.search).get('ref'),
    website: '',
    submittedAt: formRenderedAt,
  }),
});
```

If the same unverified email signs up again, Open Waitlist resends the verification email instead of returning a duplicate error. Resends are rate-limited per email.

Rate-limited requests return `429` with:

```http
Retry-After: 60
X-RateLimit-Limit: 10
X-RateLimit-Remaining: 0
X-RateLimit-Reset: 1778840060
```

## GET /api/waitlist/verify?token=...

Verifies an email address, optionally credits the referrer, sends welcome emails, and redirects.

Verification and referral crediting happen in one Supabase RPC transaction via `verify_waitlist_signup`.

Default redirect:

```text
/waitlist/verified?code=abc123
```

Custom redirect:

```bash
WAITLIST_SUCCESS_URL="https://your-frontend.com/waitlist/verified"
```

Open Waitlist appends `?code=...`.

## GET /api/waitlist/position?code=...

Returns the verified user's dynamic rank and referral link.

Rank is computed by `waitlist_rank_for_code`, ordered by verified referral count, then signup time.

Success response:

```json
{
  "position": 42,
  "referralCount": 3,
  "referralLink": "https://your-site.com?ref=abc123"
}
```

Example:

```ts
const code = new URLSearchParams(location.search).get('code');
const response = await fetch(
  `https://your-backend.com/api/waitlist/position?code=${encodeURIComponent(code ?? '')}`,
);
const data = await response.json();
```

## Error Shape

Most errors return:

```json
{
  "error": "Human readable message"
}
```
