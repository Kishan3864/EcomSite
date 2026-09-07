# Mayura — storefront

A production-quality customer-facing storefront for an Indian e-commerce brand.
Next.js App Router, TypeScript, Tailwind v4, Motion. Static/mock data today,
wired so it can be swapped for a database or API without touching the UI.

```bash
npm run dev     # http://localhost:3000
npm run build   # 212 prerendered pages
npm run lint
```

## The one thing to know

Everything the UI renders comes through **`src/services/`**. Those functions are
async, take plain arguments and return plain serialisable objects — the exact
shape a real API would. Replacing a mock body with a `fetch()` or a Prisma query
is the whole migration; no component changes.

```
components  →  services/catalog.ts  →  data/*.ts        (today)
components  →  services/catalog.ts  →  fetch() / db     (later)
```

`src/services/catalog.ts` is `server-only`, so the catalogue can never leak into
a client bundle by accident.

## Layout

| Path | What lives there |
| --- | --- |
| `src/data/` | Mock data: products, taxonomy, reviews, offers, orders, policies. All images resolve through `data/images.ts` — no URL is written in a component. |
| `src/services/` | The data boundary. Async, server-only, returns domain objects. |
| `src/lib/` | Pure logic: types, pricing rules, URL⇄query translation, card view models, formatting. |
| `src/store/` | Client commerce state (cart, wishlist, orders, checkout draft) via reducer + localStorage. Actions map one-to-one onto future `/api` calls. |
| `src/components/` | UI, grouped by area. `ui/` holds the primitives every page shares. |

## Customer journey

Home → category → subcategory → product → cart → contact → address → delivery →
payment → review → payment processing → order confirmed → tracking.

Every step works against local state: filters and sorting drive real URLs,
quantity and wishlist controls persist, coupons validate against minimum spend
and category rules, and the checkout produces a real order object that appears
in **My orders** and **Track order**.

## Design system

Tokens live in `src/app/globals.css` under `@theme` — peacock teal, marigold,
rani pink, warm neutrals, plus radius, elevation and easing scales. Change them
there and the whole storefront follows. Brand identity (mark, wordmark, name,
contact details) is confined to `src/components/brand/logo.tsx`.

Type is Fraunces for display and Plus Jakarta Sans for UI, loaded via
`next/font`.

## Notes on the build

- **SEO** — per-route metadata and canonicals, Open Graph, JSON-LD for
  Organization, WebSite, Product, Breadcrumb, ItemList and FAQ, plus a
  `sitemap.ts` generated from the same service layer the pages use.
- **Motion** — reduced-motion is respected through
  `lib/use-reduced-motion.ts`, which reads the media query via
  `useSyncExternalStore` so the preference never causes a hydration mismatch.
- **Images** — the product catalogue stays server-side; only a compact search
  index crosses to the client for the header autocomplete
  (`services/search-docs.ts` explains the trade).
- **Not included, by design** — no admin panel, database, payments, or backend.
  The payment step is a faithful UI with no gateway behind it.
