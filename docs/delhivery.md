# Delhivery One — the courier

WeekendCart ships with **Delhivery** (the account is on Delhivery One, their
self-serve panel — the API behind it is the same Delhivery Express API). This
page is how the shop talks to it, how to test it without moving a single
parcel, and how to switch it live.

## What the integration does

| Where | What happens | Delhivery call |
|---|---|---|
| Product page → *Check delivery to your pincode* | Asks Delhivery whether it delivers to that pincode and whether cash on delivery is offered there. The delivery date shown is the product's own promise, not Delhivery's. | `GET /c/api/pin-codes/json/` |
| Admin → order → *Book with Delhivery* | Creates the shipment on your Delhivery account. The order gets the waybill, moves from *confirmed* to *packed*, and the customer's order page shows "Packed and booked with Delhivery". | `POST /api/cmu/create.json` |
| Admin → order → *Request pickup* | Asks Delhivery to collect from your registered pickup address on a date you choose (after 2 pm). | `POST /fm/request/new/` |
| Admin → order → *Label* | Opens the printable shipping label (PDF) for the waybill. | `GET /api/p/packing_slip` |
| Admin → order → *Refresh tracking*, and the customer's order and track pages | Pulls Delhivery's scans into the order's timeline and moves the status forward — *shipped*, *out for delivery*, *delivered* — on its own. Customer pages do this at most once every 20 minutes; the admin button does it immediately. | `GET /api/v1/packages/json/` |

A COD order is marked **paid** the moment Delhivery reports it delivered, since
the courier collected the money at the door. Nothing ever moves a status
backwards: a stray scan cannot un-deliver an order.

If Delhivery is unreachable, every page still renders — the pincode checker
says so and the order page simply shows what it already knew.

Nothing in this integration is required. With the keys left out, the pincode
checker falls back to the shop-wide delivery promise and the admin order page
says how to connect Delhivery; you book on Delhivery One's website and type the
courier and waybill in by hand, exactly as before.

## Connecting it, and testing it safely

Delhivery runs two systems, and the shop picks one from a single variable:

| `DELHIVERY_ENV` | Host | Token | Effect |
|---|---|---|---|
| `production` | `track.delhivery.com` | the token from Delhivery One | Real shipments, real pickups, real bills |
| `staging` | `staging-express.delhivery.com` | a separate staging token | Bookings get a waybill and tracking; nothing moves, nothing is billed |

**Delhivery One issues only the live token** (*Settings → API and MCP Setup*).
A staging token is something Delhivery's support hands out on request; if you
have one, use `staging` first and everything below applies unchanged. Without
one, test on the live account the safe way: **book one real shipment and cancel
it before pickup**. A shipment cancelled unpicked is never billed, and the
cancel goes through the same API, so it proves the whole path.

The code is the same for both. Only the host and the token differ.

### 1. Get the two things from Delhivery One

1. **API token** — *Settings → API and MCP Setup → Existing API Token → View*.
   Generating a new one invalidates the old one immediately, so if you ever
   regenerate it, update `.env` straight away.
2. **Pickup location name** — *Settings → Pickup Locations*. Copy the **name**
   of your registered address exactly, including capitals and spaces. Delhivery
   matches it letter for letter; a booking with a name it does not know is
   refused.

### 2. Put them in `.env` — Server (VPS)

```
cd ~/ecom.flexypdf.com && nano .env
```

```
DELHIVERY_ENV="production"
DELHIVERY_API_TOKEN="<the token>"
DELHIVERY_PICKUP_LOCATION="<the pickup location name>"
```

```
pm2 reload weekendcart
npx tsx scripts/check-delhivery.ts
```

The check script is read-only. It prints which environment it is on and looks
up a pincode (pass another as the first argument) — that lookup needs the
token, so a real answer proves the token too. If it says the token was
rejected, the token is wrong or belongs to the other environment. If it cannot
connect, the server could not reach Delhivery — the same network the Google
sign-in notes describe.

### 3. Book one parcel, then cancel it

1. Place a **cash on delivery** order on the site (an online order must be paid
   before it can be booked).
2. Open it in `/admin/orders`. The *Shipment* card shows **Delhivery — Live**
   and a **Book with Delhivery** button. Press it.
3. The order now has a waybill, its status is *packed*, and the customer's
   order page shows the booking on the timeline. The shipment is also visible
   on Delhivery One under *Orders & Pickups*.
4. **Label** opens the PDF; **Refresh tracking** pulls the current status
   (a fresh booking says *Manifested*).
5. **Cancel order** on the same page, with any reason. The shipment is
   cancelled with Delhivery in the same step; check *Orders & Pickups* on
   Delhivery One shows it cancelled. Nothing is billed.

Do **not** press *Request pickup* on a test booking — that asks a courier to
come.

If a booking is refused, the message on the card is Delhivery's own reason —
most often an unknown pickup location name, a pincode they do not serve, a
phone number that is not ten digits, or a wallet balance too low for the
shipment (Delhivery One is prepaid: *Finances → Wallet*).

From then on every *Book with Delhivery* is a real shipment on your account;
*Request pickup* when the parcel is packed, and print the *Label* onto it.

## What a booking sends

Everything comes from the order and from `src/config/business.ts`:

- consignee: the delivery address on the order, the shipping name and phone
- seller / return address: `BUSINESS.legalName`, `BUSINESS.supportPhone`,
  `BUSINESS.address` — keep these true, they are printed on the label
- payment mode: *COD* with the order total to collect, or *Prepaid*
- description: the line titles and quantities; HSN from the first line
- **weight**: the sum of each product's *Weight* (grams, on the product form)
  times its quantity. Delhivery bills by the greater of real and volumetric
  weight, so an honest weight on every product keeps the bill honest. A product
  with no weight entered counts as 1 kg.
- box: one standard 30 × 25 × 20 cm carton; change `DEFAULT_BOX_CM` in
  `src/services/admin/shipping-actions.ts` if your cartons differ

## Where the code is

| File | Role |
|---|---|
| `src/lib/shipping/delhivery.ts` | The client: hosts, token header, every endpoint, Delhivery's shapes turned into ours. No database. |
| `src/lib/shipping/tracking.ts` | Pulls tracking into an order's timeline, throttled, forwards-only. |
| `src/services/shipping.ts` | The pincode check the product page calls (rate-limited). |
| `src/services/admin/shipping-actions.ts` | Book, pickup, refresh — the admin buttons. |
| `src/app/api/admin/orders/[id]/label/route.ts` | The label link. |
| `src/app/admin/(dashboard)/orders/order-forms.tsx` | The *Shipment* card in the admin panel. |
| `src/components/product/delivery-check.tsx` | The pincode checker on the product page. |
| `scripts/check-delhivery.ts` | The connection check. |

Every call goes through `httpsFetch` in `src/lib/net/outbound.ts` rather than
`fetch`, for the same reason the Google and Razorpay calls do: this server's
outbound connections are unreliable and the helper races both address families.

## When Delhivery changes something

Their API has been stable for years, but if a booking starts failing with a
field name in the message, the payload is built in `createShipment` in
`src/lib/shipping/delhivery.ts` — every field is named there in Delhivery's own
vocabulary, next to the value it is filled from.
