# Mayura — storefront + admin

A production-quality Indian e-commerce storefront with a full admin panel, on
Next.js 16 (App Router), TypeScript, Tailwind v4, Motion, and **Prisma 7 +
PostgreSQL**.

```bash
npm install          # also generates the Prisma client
npm run db:start     # isolated local Postgres 16 on :5433 (first run initialises it)
npm run db:migrate   # apply migrations
npm run db:seed      # 137 products, categories, brands, reviews, demo orders, admin user
npm run dev          # http://localhost:3000  ·  admin at /admin
```

Local logins after seeding:

| Where | Email | Password |
| --- | --- | --- |
| `/admin` | `admin@mayura.in` (owner) | `Mayura@2026` |
| `/login` (storefront) | `ananya.iyer@example.in` | `Ananya@2026` |

Change both from the admin **Settings → Profile** / storefront account before going live.

## How it fits together

```
storefront pages  →  src/services/*.ts   →  Prisma (src/lib/db.ts)  →  Postgres
admin pages       →  db reads in page    →  src/services/admin/*-actions.ts (writes)
```

- **`src/services/catalog.ts`** — every storefront read (products, categories, brands,
  offers, banners, reviews, Q&A, search). Same function signatures as the phase-1
  mock layer, so the UI never changed when the database arrived.
- **`src/services/commerce.ts`** — storefront writes: `placeOrder` (re-prices from the
  DB, validates stock and coupons, writes order + lines + events, decrements stock),
  customer auth, addresses, returns, reviews, contact, newsletter.
- **`src/services/orders.ts`, `settings.ts`, `search-docs.ts`** — order reads and
  access control, store settings with defaults, header autocomplete index.
- **`src/services/admin/*-actions.ts`** — one file per admin module; every write
  validates, logs to `ActivityLog`, and revalidates the storefront.
- **`src/lib/auth/`** — bcrypt passwords, signed JWT cookies (jose), admin roles
  (OWNER / MANAGER / STAFF) with token-version revocation, customer sessions, and a
  signed guest-orders cookie so guests can see their own confirmations.
- **`src/proxy.ts`** — edge guard for `/admin/*` and `/account/*`.

`docs/admin-module-guide.md` documents the admin conventions and the reference module.

## Admin panel (`/admin`)

Dashboard (revenue, orders, AOV, customers, trend, top products, category share,
attention list) · Orders (workflow, tracking events, shipment, cancel/restock,
invoice) · Returns (approve → pick-up → refund with restock) · Customers ·
Products (full editor: images, variants, specs, relations, SEO) · Categories &
subcategories · Brands · Inventory (adjustments, ledger, CSV export) · Coupons &
offers · Banners · Reviews & Q&A moderation · Inbox (contact messages,
newsletter) · Settings (store, shipping, payments, tax, inventory, team, profile) ·
Activity log.

## Database

- Schema: `prisma/schema.prisma`; migrations in `prisma/migrations/`.
- Local dev uses an isolated cluster in `./.pgdata` (gitignored) via
  `scripts/db-local.mjs`, so it never touches a system Postgres on 5432.
- `npm run db:seed` is idempotent — safe to re-run after a schema change.
- `npm run db:studio` opens Prisma Studio.

## Environment

Copy `.env.example` → `.env`:

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `AUTH_SECRET` | ≥ 24 chars; signs every session cookie |
| `NEXT_PUBLIC_SITE_URL` | public origin for canonicals and sitemap |
| `ADMIN_SEED_EMAIL` / `ADMIN_SEED_PASSWORD` | first admin, created by the seed only if none exists |

## Deploying to ecom.flexypdf.com

See **`deploy/README.md`** — a step-by-step runbook plus `deploy/deploy.sh`
(pull → install → migrate → seed-if-empty → build → PM2 reload), an nginx vhost
and a PM2 process file. It adds one app, one port (3040), one vhost and one
database, and touches nothing else on the server.

## Design system

Tokens live in `src/app/globals.css` under `@theme` — peacock teal, marigold,
rani pink, warm neutrals. Brand identity is confined to
`src/components/brand/logo.tsx`. Type: Fraunces (display) + Plus Jakarta Sans (UI).

## Not in this phase

Payment gateway (checkout simulates authorisation and records the method),
transactional email (contact replies and password reset are recorded, not sent),
image uploads (images are URLs — the admin previews them). Each has a clear seam
in `src/services/` to plug into.
