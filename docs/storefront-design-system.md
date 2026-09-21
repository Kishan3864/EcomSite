# Storefront design system — "Midnight & Champagne"

Customer-facing pages only. The admin panel keeps its own look and must not change.

## Where it lives

- `src/app/storefront.css` — palette overrides (scoped to `[data-storefront]`), type scale, surfaces, motion. Read it first.
- `src/components/ui/primitives.tsx` — `Badge`, `Stars`, `RatingChip`, `Price`, `SectionHeader` (now takes `action`), `Breadcrumbs`, `EmptyState` (takes `icon`, a 24px lucide glyph), `PageHeader` (crumbs + title + description + meta + action), `Skeleton`.
- `src/components/ui/button.tsx` — `Button` / `buttonClasses(variant, size)`. `primary` = cobalt "go on", `accent` = champagne gold "add to bag / main buy CTA", `outline`/`subtle` = grey secondary, `ghost`, `danger`, `link`.
- `src/components/ui/category-icon.tsx` — `CategoryIcon` / `categoryIconFor(icon, name)`.
- `src/components/product/product-card.tsx` — `ProductCard` with `layout`: `grid` | `rail` | `compact` | `list`.
- `src/components/product/badges.tsx` — `ProductBadges`, `ProductBadgeMark`, `BrandMark`.

## Palette (Tailwind token names are unchanged, values are new)

- `brand-*` midnight cobalt — links, primary buttons, active states, icon tiles (`bg-brand-50 text-brand-700`).
- `gold-*` champagne — the one "press this" colour (add to bag, main CTA) and small premium highlights.
- `iris-*` cool violet — only inside gradients (`.aurora`, `.edge-glow`). Never text or buttons.
- `ink-*` cool graphite neutrals. `ink-500` is the floor for readable text; `ink-400` is decorative only.
- `sale-*` raspberry — reductions only. `canvas` page, `surface` white cards, `line` / `line-strong` borders.

## Type — small and refined

`t-display` (hero only) · `t-h1` page title · `t-h2` section title · `t-h3` card title · `t-body` 14px · `t-small` 12.5px meta · `t-label` 11px caps · `t-price` figures.
No text larger than `t-h1` except the home hero. Prefer 12–14px for UI text.

## Icons — one set, one style

- `lucide-react` only. Sizes 14 / 16 / 18 / 20 / 24. Colour via `currentColor`.
- Do not pass `strokeWidth` (CSS enforces 1.75 everywhere). Exception: `strokeWidth={0}` with `fill="currentColor"` for filled stars.
- Default icon colour `text-ink-500`; active / in a tile `text-brand-700`. Put feature icons in `.icon-tile` (40px) or `.icon-tile icon-tile-sm` (32px).
- Do not use the old hand-drawn illustrations (`components/illustration/*`, `PaperMark`, `DepartmentGlyph`, counter glyphs, journey line, route illustration) on redesigned pages.

## Surfaces & shape

- `.card` white, 1px `line`, radius 18, faint shadow. `.card-interactive` lifts on hover. `.card-muted` tinted inset panel. `.card-divided` rows split by lines.
- `.glass` frosted white (sticky bars). `.aurora` light cobalt/iris/champagne ground. `.midnight` dark panel (white text). `.grid-lines` faint decorative grid. `.edge-glow` gradient hairline.
- Radii: controls `rounded-md` (12), cards `rounded-xl` (18), big panels `rounded-2xl`/`rounded-3xl`, pills `rounded-full`.
- Chips: `.chip` or `rounded-full border border-line-strong px-3 h-8 text-[12.5px]`.

## Layout

- `container-page` for width. `.section` / `.section-tight` for vertical rhythm.
- Inner pages start with `PageHeader` on the canvas; content sits in cards.
- Sticky elements under the header: `sticky-under-header` (or `top-(--sticky-top)`). The mobile header height is `var(--header-h)`; never hard-code `top-[57px]` / `top-[132px]`.
- Phones: 2-column product grids, full-width buttons, drawers for filters. Bottom nav is ~61px + safe area; fixed bottom bars sit above it.

## Motion

Transitions 150–250ms with `ease-out`. `motion/react` is available. Everything must respect reduced motion (`usePrefersReducedMotion` from `@/lib/use-reduced-motion`, or `motion-safe:` classes). `.reveal` staggers children in.

## Hard rules

- Never change business logic, server actions, data fetching, prices, order/checkout/payment flows or emails.
- Keep existing copy. Policy page text must stay word-for-word.
- No new dependencies, no external image/video CDNs, keep using `@/components/ui/image`.
- Accessible: visible focus, labels on icon buttons, keyboard reachable, contrast as above.
