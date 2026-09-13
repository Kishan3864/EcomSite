# Putting the first real catalogue in

Written for whoever runs the shop, not for a developer. Everything here happens
in the admin panel at `https://weekendcart.com/admin`, except the product
photos, which have to be put on the server first.

## Order matters

A product cannot be saved until the things it points at exist. Create them in
this order, or the dropdowns on the product form will be empty:

1. **Brand** — Products → Brands → New. The maker's name (Philips, Bajaj, your
   own label). One is enough to start.
2. **Category** — Categories → New. This is the department in the top menu.
3. **Collection** (subcategory) — open the category you just made → New
   collection. Every product must sit in one, so make at least one.
4. **Product** — Products → New.

## Product photos

**There is no upload button.** The product form asks for an image *address*,
and it accepts only two kinds:

- a path inside this site, starting with `/` — e.g. `/products/mixer-front.jpg`
- a full `https://` address, but **only** from `images.unsplash.com`,
  `images.pexels.com` or `cdn.pixabay.com`

Anything else — a Google Drive link, a WhatsApp link, your own other website —
is refused by the image layer and the card renders empty. That list lives in
`next.config.ts` under `images.remotePatterns`.

So for real photographs, put the files in the repository and use the first
kind. On your PC:

**Windows**

```powershell
# put the photos in C:\EcomSite\public\products\  (jpg or webp, about 1200px wide)
git add public/products
git commit -m "Add product photographs"
git push origin main
```

Then deploy as usual, and paste `/products/<filename>` into the form. A file at
`public/products/mixer-front.jpg` is served at `/products/mixer-front.jpg`.

Name the files in plain lowercase with hyphens and no spaces.

## What the product form needs

Have these ready before you start; the form will not save without the ones
marked required.

| Field | Required | Notes |
| --- | --- | --- |
| Title | yes | What a shopper sees. |
| Subtitle | yes | One short line under the title. |
| Description | yes | A paragraph or two. |
| SKU | yes | Your own code, unique across the shop. |
| Price | yes | Whole rupees, at least ₹1. What is charged. |
| MRP | yes | Whole rupees. The struck-through price; set it equal to Price if there is no discount. |
| Stock | yes | Whole number. |
| Brand / Category / Collection | yes | From the lists you made above. |
| Images | yes | At least one. The second one is used as the hover image on cards. |
| HSN code | no | 4, 6 or 8 digits. Left empty it inherits the category's. |
| GST rate | no | Inherits the category's, then Settings. |
| Status | yes | **ACTIVE** puts it on the storefront. DRAFT keeps it hidden. |

Badges (Bestseller, New in, Trending) are optional and purely decorative —
"What people keep buying" ranks by units sold whether or not anything is
badged.

## How the storefront reacts

Nothing needs switching on. The homepage looks at how much catalogue exists and
picks a shape it can fill:

| Products | What the homepage shows |
| --- | --- |
| 0 | A typographic hero and a plain note about what is coming |
| 1 | That product as a full-width magazine spread |
| 2–3 | One even grid of all of them, cards at full size |
| 4–9 | One product as a spread, the rest in a grid below it |
| 10+ | The full composition: departments, deals, bestsellers, new this month |

Categories do the same: one department is a single wide tile, four or more
become the mosaic.

Changes appear within two minutes — the storefront caches pages for that long.

## GST for home appliances

For the category's defaults (Categories → your category → HSN code and GST
rate), appliances usually sit at **18%**. Common codes:

| Goods | HSN | GST |
| --- | --- | --- |
| Mixers, grinders, food processors, small kitchen appliances | 8509 | 18% |
| Irons, kettles, toasters, heaters, other domestic electro-thermal | 8516 | 18% |
| Fans | 8414 | 18% |
| Vacuum cleaners | 8508 | 18% |

Set the category default once and every product in it inherits it; override it
on the odd product that differs. Confirm the exact code against your supplier's
invoice — the HSN printed on your purchase bill is the one to repeat on yours.
