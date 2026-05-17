<p align="center">
  <img src="./public/icon.svg" alt="Open Waitlist logo" width="72" />
</p>

<h1 align="center">Open Waitlist</h1>

<p align="center">
  <strong>The open-source waitlist you actually own.</strong><br />
  Verified signups, referral links, dynamic ranking, and abuse protection. No lock-in.
</p>

<p align="center">
  <a href="https://open-waitlist-seven.vercel.app">Live Demo</a>
  ·
  <a href="#vibe-coding-setup">Vibe coding setup</a>
  ·
  <a href="#quick-start">Quick start</a>
  ·
  <a href="#setup">Setup</a>
  ·
  <a href="#bring-your-own-frontend">Bring your own frontend</a>
  ·
  <a href="./docs/API.md">API docs</a>
  ·
  <a href="./docs/FAQ.md">FAQ</a>
  ·
  <a href="./docs/DEPLOYMENT.md">Deploy</a>
</p>

<p align="center">
  <a href="https://github.com/zaidazmi/open-waitlist/blob/main/LICENSE"><img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-21e5ad" /></a>
  <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black" />
  <img alt="Supabase" src="https://img.shields.io/badge/Supabase-ready-3ecf8e" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-strict-3178c6" />
</p>

<p align="center">
  <a href="https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fzaidazmi%2Fopen-waitlist&env=NEXT_PUBLIC_SUPABASE_URL,NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,SUPABASE_SECRET_KEY,RESEND_API_KEY,WAITLIST_FROM_EMAIL,NEXT_PUBLIC_SITE_URL&envDescription=Supabase%20and%20Resend%20credentials%20needed%20to%20run%20Open%20Waitlist&envLink=https%3A%2F%2Fgithub.com%2Fzaidazmi%2Fopen-waitlist%2Fblob%2Fmain%2F.env.example&project-name=open-waitlist&repository-name=open-waitlist"><img src="https://vercel.com/button" alt="Deploy with Vercel" /></a>
</p>

<!-- TODO: Add a screenshot or demo GIF here -->
<!-- <p align="center"><img src="./docs/demo.gif" alt="Open Waitlist demo" width="720" /></p> -->

---

## Why I built this

I vibe code a lot of side projects and I kept needing a waitlist before the thing was even half done. Paying $29/mo for a signup form felt dumb when I could just build one myself. Runs on your own Supabase and Vercel, takes a few minutes to set up, and you keep your data.

| Feature | What it does |
| --- | --- |
| Verified signups | Double opt-in emails before a user counts toward ranking. |
| Referral links | Every verified user gets a shareable link. Referrals move them up. |
| Dynamic ranking | Rank is computed live from referral count, then signup time. |
| Abuse protection | DB-backed rate limiting, email resend limits, honeypot field, timing checks. |
| Own your data | Everything is stored in your Supabase project. Export anytime. |
| Bring your own frontend | Use the included UI or call the API from your existing site. |

## How it works

```
1. User signs up        POST /api/waitlist
                        ↓
2. Verification email   Sent via Resend with unique token
                        ↓
3. User clicks link     GET /api/waitlist/verify?token=...
                        ↓
4. Atomic verification  Email verified + referrer credited in one transaction
                        ↓
5. Rank assigned        Dynamic rank = referral count (desc) → signup time (asc)
                        ↓
6. User shares link     Referral code in URL → more signups → rank improves
```

## Vibe coding setup

If you use an AI coding agent (Claude Code, Cursor, Copilot, Windsurf, etc.), point it at this repo and paste one of these prompts.

Add a waitlist to an existing project:

```
I want to add a waitlist to my project. Use https://github.com/zaidazmi/open-waitlist as reference.

Read the repo's docs/ARCHITECTURE.md for the system design and docs/API.md for the API spec.
Read supabase/schema.sql for the database schema and RPC functions.
Read docs/OWN_FRONTEND.md for how to integrate with an existing frontend.

Set up:
1. Run supabase/schema.sql in my Supabase project
2. Create the API route handlers based on src/app/api/waitlist/
3. Add a signup form to my landing page that calls POST /api/waitlist
4. Add a verified page that shows rank and referral link via GET /api/waitlist/position
5. Configure .env.local with my Supabase and Resend credentials using .env.example as template
```

Deploy the full app as-is:

```
Clone https://github.com/zaidazmi/open-waitlist and help me deploy it.

Read the README for the quick start and docs/DEPLOYMENT.md for production setup.
Read .env.example for all the environment variables I need to configure.
Read docs/SUPABASE.md for database setup. I need to run supabase/schema.sql.

Set up Supabase, configure Resend email, set environment variables, and deploy to Vercel.
```

Use just the backend API with your own frontend:

```
I want to use https://github.com/zaidazmi/open-waitlist as a headless backend for my existing site.

Read docs/OWN_FRONTEND.md for the full integration guide and docs/API.md for endpoint specs.
Read src/lib/waitlist-config.ts for all available config options.

Set up the backend with WAITLIST_ALLOWED_ORIGINS for my domain, then give me the fetch calls
I need for: signup, email verification redirect handling, and position/rank lookup.
```

Customize the landing page:

```
I want to customize the Open Waitlist landing page.

Read src/components/WaitlistHero.tsx for the main signup form and feature list.
Read src/components/WavyBackground.tsx for the animated background.
Read src/components/ShinyButton.tsx for the CTA button styling.
Read src/app/page.tsx for the page layout.
Read src/app/globals.css for the theme variables and colors.

Help me change [describe what you want: colors, copy, layout, animations, etc.]
```

## Quick start

```bash
cd open-waitlist
npm install
cp .env.example .env.local
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The UI runs without any credentials. Signups won't work until you add Supabase and Resend keys (see [Setup](#setup)).

## Choose a mode

| Mode | Use this when |
| --- | --- |
| Full app | You want the included landing page, API routes, verification flow, and share page. |
| Backend only | You already have a site and only need the signup, verification, referral, and ranking API. |

## Setup

### 1. Supabase

Create a Supabase project, open **SQL Editor**, and run:

```sql
-- paste the contents of supabase/schema.sql
```

Then add your project values to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SECRET_KEY="your-service-role-or-secret-key"
```

`SUPABASE_SECRET_KEY` is server-only. Never expose it in browser code.

Full guide: [docs/SUPABASE.md](./docs/SUPABASE.md)

### 2. Resend

Verify a sending domain in Resend, create an API key, and add:

```bash
RESEND_API_KEY="re_your_api_key"
WAITLIST_FROM_EMAIL="Open Waitlist <hello@example.com>"
WAITLIST_REPLY_TO="hello@example.com"
```

### 3. App URL

Set the public URL used for referral links:

```bash
NEXT_PUBLIC_SITE_URL="https://your-site.com"
```

See every option in [.env.example](./.env.example).

## Bring your own frontend

You can deploy Open Waitlist as a backend and call it from your existing site.

```bash
NEXT_PUBLIC_SITE_URL="https://acme.com"
WAITLIST_API_URL="https://waitlist-api.acme.com"
WAITLIST_SUCCESS_URL="https://acme.com/waitlist/verified"
WAITLIST_ALLOWED_ORIGINS="https://acme.com,http://localhost:5173"
```

Signup request:

```ts
const formRenderedAt = Date.now();

await fetch('https://waitlist-api.acme.com/api/waitlist', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: 'person@example.com',
    referredBy: new URLSearchParams(window.location.search).get('ref'),
    website: '',
    submittedAt: formRenderedAt,
  }),
});
```

After verification, users are redirected to:

```text
https://acme.com/waitlist/verified?code=abc123
```

Then your frontend can fetch rank and referral details:

```ts
const response = await fetch(
  `https://waitlist-api.acme.com/api/waitlist/position?code=${code}`,
);
const data = await response.json();
```

Guide: [docs/OWN_FRONTEND.md](./docs/OWN_FRONTEND.md)
Example: [examples/custom-frontend](./examples/custom-frontend)

## API

| Route | Method | Purpose |
| --- | --- | --- |
| `/api/waitlist` | `POST` | Create signup or resend verification email. |
| `/api/waitlist/verify?token=...` | `GET` | Verify email and credit referrals atomically. |
| `/api/waitlist/position?code=...` | `GET` | Return dynamic rank, referral count, and referral link. |

Full reference: [docs/API.md](./docs/API.md)

## Viewing signups

Signups live in your Supabase `waitlist` table.

1. Open your Supabase project.
2. Go to Table Editor and open the `waitlist` table.
3. Filter `verified = true` for confirmed users.

| Column | Meaning |
| --- | --- |
| `email` | The signup email. |
| `verified` | Whether the user confirmed by email. |
| `referral_code` | The user's share code. |
| `referred_by` | The code that referred this user, if any. |
| `referral_count` | Verified referrals credited to this user. |
| `position` | Original signup order. Public rank is computed dynamically. |

Export queries: [docs/SUPABASE.md#8-viewing-and-exporting-signups](./docs/SUPABASE.md#8-viewing-and-exporting-signups)

## Project structure

```text
src/app/api/waitlist/        API routes (signup, verify, position)
src/app/waitlist/verified/   Verified user share page
src/components/              Landing page UI components
src/lib/                     Supabase, Resend, ranking, CORS, rate limits, bot protection
supabase/schema.sql          Database schema and RPC functions
docs/                        Architecture, API reference, setup guides
examples/custom-frontend/    Minimal standalone frontend example
```

## Production checklist

- [ ] Run `npm run lint` and `npm run build`
- [ ] Run `npm audit --omit=dev`
- [ ] Execute `supabase/schema.sql` in production Supabase
- [ ] Set all production environment variables
- [ ] Verify your Resend sending domain
- [ ] Test: signup, duplicate resend, verification, referral credit, rank lookup
- [ ] Set `WAITLIST_ALLOWED_ORIGINS` if using a separate frontend
- [ ] Confirm CI is green

## Docs

| Document | Description |
| --- | --- |
| [Architecture](./docs/ARCHITECTURE.md) | System design, data flow, and abuse protection |
| [API Reference](./docs/API.md) | Endpoint specs, request/response shapes, error codes |
| [Supabase Setup](./docs/SUPABASE.md) | Schema, RPC functions, ranking logic, export queries |
| [Own Frontend](./docs/OWN_FRONTEND.md) | Guide for using your own UI with the API |
| [Deployment](./docs/DEPLOYMENT.md) | Production hosting and Vercel setup |
| [FAQ](./docs/FAQ.md) | Common questions and answers |
| [Roadmap](./docs/ROADMAP.md) | Planned features |
| [Changelog](./CHANGELOG.md) | Version history |
| [Contributing](./CONTRIBUTING.md) | How to contribute |

## License

MIT

---

<p align="center">
  Found this useful? A star helps others find it.<br />
  <a href="https://github.com/zaidazmi/open-waitlist">Star on GitHub</a>
</p>
