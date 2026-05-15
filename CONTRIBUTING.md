# Contributing

Thanks for helping improve Open Waitlist.

## Local Development

```bash
npm install
cp .env.example .env.local
npm run dev
```

Run checks before opening a pull request:

```bash
npm run lint
npm run build
npm audit --omit=dev
```

## Pull Request Guidelines

- Keep changes focused and easy to review.
- Include setup or migration notes when behavior changes.
- Do not commit secrets, local `.env` files, database dumps, or provider keys.
- Prefer small, explicit migrations for database changes.
- Keep public API responses stable unless the change is intentional and documented.

## Development Priorities

The current implementation is intentionally minimal. Useful contributions include:

- Turnstile/CAPTCHA adapters
- Disposable email protection
- Additional bot-signal adapters
- Admin export and basic analytics
- Tests for the API routes
