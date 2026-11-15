# APM Forex - APM Tours & Travels Forex Portal

Customer-facing forex ordering site (buy/sell foreign currency **notes** against INR) with an
RBI/FEMA-aligned KYC checkout, plus a real-time admin console for KYC approval, hand-over,
order history, daily GST/service-charge settings and hero banners.

The full product spec lives in [`docs/spec.json`](docs/spec.json). Compliance assumptions that
need sign-off are tracked in [`COMPLIANCE_TODO.md`](COMPLIANCE_TODO.md).

> **Admin authentication is intentionally disabled** (`ADMIN_AUTH_ENABLED=false`). The admin UI shows
> a red "Auth disabled - do not deploy publicly" bar. Do not expose `/admin` publicly until it is
> implemented - see [Admin auth](#admin-auth-deferred).

## Stack

Next.js 16 (App Router, TypeScript strict) · Tailwind CSS 4 · Prisma 6 (SQLite in dev, Postgres-compatible
schema) · zod 4 · react-hook-form · zustand · Radix primitives · pdf-lib · @dnd-kit · framer-motion ·
vitest · Playwright.

## Setup

Requires Node 22+.

```bash
npm install
```

```bash
cp .env.example .env
```

Set `ORDER_TOKEN_SECRET` in `.env` to a random value (`openssl rand -hex 32`), then:

```bash
npm run db:migrate
```

```bash
npm run db:seed -- --demo
```

```bash
npm run assets:fetch
```

```bash
npm run dev
```

- Site: http://localhost:3000 · Admin: http://localhost:3000/admin
- `db:seed` creates settings, the 30 currencies (rates from the feed, or approximate fallbacks if
  offline), the Dum Dum store, 4 hero banners and 8 clearly-labelled **placeholder** reviews.
  `--demo` adds 6 demo orders for admin UI work.
- `assets:fetch` downloads free-licence hero banners (Unsplash) and flags (flagcdn) into `/public`
  and looks for licensed banknote photos on Wikimedia Commons (credits in `public/*/CREDITS.json`).
  Where no suitably licensed current-series photo is found it generates a designed tile (flag,
  symbol, code, name); the committed currency images are all designed tiles for now. The generated
  assets are committed, so this is only needed to refresh them.
- Admin-uploaded banners are stored through the `StorageProvider` and served from `/media/banners/...`
  (files added to `/public` at runtime are not served by `next start`).

## Scripts

| Script | What it does |
|---|---|
| `dev`, `build`, `start` | Next.js |
| `lint`, `typecheck` | ESLint, `tsc --noEmit` |
| `test` | vitest unit tests (`tests/unit`) - pricing, compliance, order state machine, ... |
| `test:e2e` | Playwright (`tests/e2e`). Spins up its own dev server on port 3210 with a fresh `prisma/e2e.db` (reset + seeded with `--demo`), warms every route first (`tests/e2e/warmup.ts`). Uses dev-only helpers (`/dev/calculator-harness`, `POST /api/admin/dev/orders`) that return 404 in production |
| `db:migrate`, `db:deploy`, `db:seed` | Prisma |
| `assets:fetch` | Download/optimise images into `/public` |
| `reviews:sync` | Pull Google reviews into the `Review` table (needs `GOOGLE_PLACES_API_KEY`) |

## Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | `file:./dev.db` (SQLite) or a Postgres URL (change `provider` in `prisma/schema.prisma`) |
| `STORAGE_DIR` | KYC/banner uploads, outside `/public`, git-ignored (`./storage`) |
| `ORDER_TOKEN_SECRET` | HMAC secret (32+ chars) for order access tokens |
| `ADMIN_AUTH_ENABLED` | `false` until real admin auth exists |
| `NEXT_PUBLIC_SITE_URL` | Canonical site URL |
| `NEXT_PUBLIC_WHATSAPP_NUMBER`, `NEXT_PUBLIC_SUPPORT_PHONE`, `NEXT_PUBLIC_SUPPORT_EMAIL`, `NEXT_PUBLIC_STORE_HOURS`, `NEXT_PUBLIC_GRIEVANCE_OFFICER` | Contact details (placeholders until supplied by the owner) |
| `NEXT_PUBLIC_RBI_LICENCE_TYPE`, `NEXT_PUBLIC_RBI_LICENCE_NO` | Shown in the footer (DISC-1) |
| `GOOGLE_PLACES_API_KEY`, `GOOGLE_PLACE_ID` | Reviews sync (optional in dev) |
| `CRON_SECRET` | If set, required as a bearer token by the reviews cron route |
| `RATES_FEED_URL` | Reference rate feed (default `https://open.er-api.com/v6/latest/INR`) |
| `PAYMENT_PROVIDER` | `mock` (dev) or `razorpay` (stub) |

## Architecture notes

- **Money maths** only happens on the server in `src/lib/pricing.ts` (pure, unit-tested). The UI
  shows quotes from `POST /api/quote`; `POST /api/orders` re-prices and re-checks everything.
  Orders store a full quote + settings snapshot, so later settings changes never alter them.
- **Compliance numbers** live in `src/config/compliance.ts`; admin-editable values (GST rate,
  service charge, margins, high-value threshold, TCS) live in the `Settings` table.
  Rule checks are in `src/lib/compliance.ts`, each tagged with its spec rule id (CAP-1, PAY-1 ...).
- **Order lifecycle**: every status change goes through `src/lib/orderMachine.ts`, which writes an
  `OrderEvent` + `AuditLog` row and publishes a realtime event.
- **Realtime**: in-process EventEmitter (`src/lib/realtime.ts`) streamed to the admin via SSE at
  `GET /api/admin/stream`. This is single-process; for multiple instances swap the bus for
  Redis/Postgres LISTEN-NOTIFY.
- **Files**: `StorageProvider` (`src/lib/storage.ts`), local disk by default. KYC files are only
  readable through guarded admin routes; type is checked by magic bytes; sha256 recorded.
- **Record retention (AML-1)**: there are no hard-delete endpoints for orders, KYC or documents.
- **Rates**: `RateProvider` interface (`src/lib/rates.ts`) with the open.er-api.com default;
  customer rates = reference x (1 ± margin%). Admin can refresh or override per currency.
- Next.js 16 renamed `middleware.ts` to `proxy.ts`; the admin guard is applied in `src/proxy.ts`.

## Known gaps

- No Lighthouse/axe audit has been run yet (spec definition of done asks for 90+ mobile Performance
  and Accessibility). Responsive checks were done visually at 1440, 1024 and 360 px.
- Realtime is in-process (single Node instance).
- The Track Order rate limit and other limits key on `X-Forwarded-For`; deploy behind a proxy that
  sets it, otherwise clients can spoof it.

## Admin auth (deferred)

`src/lib/adminGuard.ts` exports `requireAdmin(request)`. `src/proxy.ts` applies it to `/admin/*`
and `/api/admin/*`, and every admin route handler calls it again. While
`ADMIN_AUTH_ENABLED=false` it allows everything. To turn on auth, implement the session/token
check inside `requireAdmin()` and set `ADMIN_AUTH_ENABLED=true` - nothing else needs refactoring.

## Plugging in a real payment provider

`src/lib/payments.ts` defines `PaymentProvider` (`start()` + `verifyWebhook()`), with a
`MockProvider` (marks the order PAID immediately in dev) and a `RazorpayProvider` stub.
To go live: implement `RazorpayProvider.start()` (create a Razorpay order, return its checkout
details), verify `X-Razorpay-Signature` in `verifyWebhook()`, record payer name/account for
PAY-2 reconciliation, and set `PAYMENT_PROVIDER=razorpay`. The webhook endpoint is
`POST /api/payments/webhook`.

## Reviews

Real reviews come from the Google Places API (New) via `npm run reviews:sync` (also a daily cron
route). Without an API key the site shows 8 cards marked "Placeholder review - development only".
In production placeholder reviews are never rendered; reviews are never fabricated.
