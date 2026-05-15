# Bring Your Own Frontend

Use this mode when you already have a marketing site or waitlist page and only want Open Waitlist to handle backend logic.

A minimal plain HTML example lives in [`../examples/custom-frontend`](../examples/custom-frontend).

## How It Works

Your frontend:

1. Reads `?ref=...` from the URL.
2. Sends email, optional referral code, an empty honeypot field, and a form-render timestamp to Open Waitlist.
3. Shows "check your inbox."

Open Waitlist:

1. Stores the signup in Supabase.
2. Sends the verification email.
3. Verifies the user when they click the email link.
4. Redirects back to your frontend with `?code=...`.
5. Provides position and referral link through the position API.

## Backend Environment

On the Open Waitlist deployment:

```bash
NEXT_PUBLIC_APP_NAME="Acme"

# Public frontend URL. Referral links use this domain.
NEXT_PUBLIC_SITE_URL="https://acme.com"

# Public backend URL. Verification emails use this domain.
WAITLIST_API_URL="https://waitlist-api.acme.com"

# Where users land after verifying.
WAITLIST_SUCCESS_URL="https://acme.com/waitlist/verified"

# Frontends allowed to call the API from a browser.
WAITLIST_ALLOWED_ORIGINS="https://acme.com,http://localhost:5173"

# Bot protection defaults. Custom frontends must send these matching fields.
WAITLIST_BOT_PROTECTION_ENABLED="true"
WAITLIST_HONEYPOT_FIELD="website"
```

## Signup Form Example

```tsx
import { useRef, useState } from 'react';

const WAITLIST_API = 'https://waitlist-api.acme.com';

export function CustomWaitlistForm() {
  const renderedAt = useRef(Date.now());
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();

    const referredBy = new URLSearchParams(window.location.search).get('ref');

    const response = await fetch(`${WAITLIST_API}/api/waitlist`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email,
        referredBy,
        website,
        submittedAt: renderedAt.current,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      setMessage(data.error || 'Something went wrong');
      return;
    }

    setMessage('Check your email to verify your spot.');
  }

  return (
    <form onSubmit={submit}>
      <input
        type="text"
        name="website"
        value={website}
        onChange={(event) => setWebsite(event.target.value)}
        autoComplete="off"
        tabIndex={-1}
        aria-hidden="true"
        style={{ position: 'absolute', left: '-10000px', width: 1, height: 1, opacity: 0 }}
      />
      <input
        type="email"
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        required
      />
      <button type="submit">Join waitlist</button>
      {message && <p>{message}</p>}
    </form>
  );
}
```

## Verified Page Example

Create a page at:

```text
https://acme.com/waitlist/verified
```

Then fetch the position using the `code` query param:

```tsx
import { useEffect, useState } from 'react';

const WAITLIST_API = 'https://waitlist-api.acme.com';

type PositionResponse = {
  position: number;
  referralCount: number;
  referralLink: string;
};

export function VerifiedWaitlistPage() {
  const [data, setData] = useState<PositionResponse | null>(null);

  useEffect(() => {
    const code = new URLSearchParams(window.location.search).get('code');
    if (!code) return;

    fetch(`${WAITLIST_API}/api/waitlist/position?code=${encodeURIComponent(code)}`)
      .then((response) => response.json())
      .then(setData);
  }, []);

  if (!data) return <p>Loading...</p>;

  return (
    <main>
      <h1>You are #{data.position}</h1>
      <p>{data.referralCount} verified referrals</p>
      <input value={data.referralLink} readOnly />
      <button onClick={() => navigator.clipboard.writeText(data.referralLink)}>
        Copy referral link
      </button>
    </main>
  );
}
```

## Same-Domain Alternative

If your frontend and backend share the same domain, you can skip CORS and use relative URLs:

```ts
fetch('/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email,
    website: '',
    submittedAt: Date.now() - 1000,
  }),
});
```

This is the simplest production setup.
