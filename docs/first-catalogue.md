# Putting the first real catalogue in

Written for whoever runs the shop, not for a developer. All of it happens in the
admin panel at `https://weekendcart.com/admin` — photographs included.

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

**Upload them.** Every image field in the admin panel — products, categories,
collections, banners — has an **Upload** button and takes a drag-and-drop. Pick
the file from this computer or your phone and it is stored immediately; the
preview appears before you have finished the rest of the form.

Accepted: **JPG, PNG or WebP, up to 8 MB each.** On a product you can select
several at once, and they are added in the order you picked them — the first is
the cover shown on cards. The arrows on each row change that order.

SVG is refused on purpose: it is a document that can carry script, not a
picture.

Pasting an address still works, for a stock photograph you already have online.
The field takes a full `https://` address, but only from
`images.unsplash.com`, `images.pexels.com` or `cdn.pixabay.com` — anywhere
else is blocked by the image layer and the card renders empty. That list lives
in `next.config.ts` under `images.remotePatterns`. Uploading avoids the
question entirely.

### Where uploaded images live

In the database, not in a folder on the server. That means they survive every
deploy without anyone having to think about it, and they are inside the nightly
`pg_dump` backup along with the orders.

**Catalogue → Images** in the admin panel lists everything uploaded, with how
many places each picture is used. Deleting is refused while anything still
points at a picture, so a product can never be left with a hole in it — change
the product first, then delete the file.

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
