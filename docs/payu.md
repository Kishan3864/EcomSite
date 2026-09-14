# PayU — the payment gateway

The shop takes card, UPI, net banking and wallet payments through **PayU**.
This page is how it works, how to test it without spending money, and how to
switch it live.

## Why PayU suits this server

A payment here never depends on this machine reaching the internet.

- **Starting a payment** is a form the *customer's browser* posts to PayU. The
  server only signs it.
- **The answer** comes back as a form PayU posts to us, carrying a SHA-512 hash
  computed from our salt. We verify it locally. Nothing is fetched, nothing is
  asked.

That matters because this box's outbound connections have been unreliable, and
a gateway that must be called server-to-server before a customer can pay is a
gateway that sometimes cannot take payments at all.

## The flow

1. Checkout → **Pay online — card, UPI, net banking**.
2. Order is written, unpaid, stock reserved.
3. `/checkout/payu/<order>` signs a transaction, creates a `PaymentAttempt`
   row, and posts the browser to PayU with a visible "Continue to payment"
   button as the fallback if the automatic submit is blocked.
4. Customer pays on PayU.
5. PayU posts back to `/api/payments/payu/return`. The hash is verified, the
   amount is checked against the attempt, and the order becomes `PAID` and
   `CONFIRMED`.
6. `/api/payments/payu/webhook` receives the same verdict independently, so an
   order still confirms if the customer's phone died on the bank page.

Both endpoints go through the same idempotent `applyPayuResponse`, so whichever
arrives first wins and the second changes nothing.

If a payment fails, the order stays — unpaid, stock still reserved — and the
order page offers **Try payment again**.

## What is checked before an order is marked paid

| Check | Why |
|---|---|
| SHA-512 reverse hash over the salt | Proves PayU sent it and nobody edited it. Compared without short-circuiting. |
| Transaction id matches a `PaymentAttempt` we created | A reply about a transaction we never started is not ours. |
| Amount equals the paise we recorded | A verified hash over a changed amount would mean the salt had leaked. Either way, not a sale. |
| `status` is exactly `success` | "pending" is the bank still thinking; the webhook brings the verdict. |

A failure at any of these is logged and the order is left alone.

## Testing it

**Keys** — PayU dashboard → **Developers → API Keys**. Switch the dashboard to
**Test Mode** to see the test key and salt; they are different from the live
pair.

Server (VPS):

```
cd ~/ecom.flexypdf.com && nano .env
```

```
PAYU_MODE="test"
PAYU_KEY="<test key>"
PAYU_SALT="<test salt>"
```

```
pm2 reload weekendcart
npx tsx --conditions=react-server scripts/check-payu.ts
```

The check script signs a sample payment and verifies a reply built from the
same salt, then tries a tampered one and a forged one. It contacts nobody. If
the genuine reply is rejected, the key and salt do not match each other and
every real payment would fail — fix that before testing on the site.

**PayU's test payment details:**

| Method | What to enter |
|---|---|
| UPI | `anything@payu` or `999999999@payu` |
| Net banking | user `payu`, password `payu`, OTP `123456` |

Test transactions appear in the dashboard under Test Mode, are never settled,
and have no limits.

## Going live

Two lines, nothing else:

```
PAYU_MODE="live"
PAYU_KEY="<live key>"
PAYU_SALT="<live salt>"
```

```
pm2 reload weekendcart
npx tsx --conditions=react-server scripts/check-payu.ts   # should say LIVE
```

The code path is identical; `PAYU_MODE` only chooses between
`test.payu.in/_payment` and `secure.payu.in/_payment`.

**Also set the webhook** in the PayU dashboard → Developers → Webhooks, to:

```
https://weekendcart.com/api/payments/payu/webhook
```

Without it, an order still confirms when the browser comes back — but a
customer whose browser never comes back leaves a paid order sitting unpaid.

## Which methods the checkout offers

```
npx tsx scripts/payment-methods.ts              # show
npx tsx scripts/payment-methods.ts upi gateway  # UPI and PayU, no COD
```

A method with no working credentials is hidden rather than offered as a dead
end. See also [upi-payments.md](./upi-payments.md) for the direct-UPI route,
which can run alongside this one.

## Where the code is

| File | Role |
|---|---|
| `src/lib/payments/payu.ts` | Hosts, hashes, form fields, response verification. No database, no network. |
| `src/services/payu-core.ts` | Signs a transaction; applies a verdict. Server-only, deliberately not a server action. |
| `src/app/(store)/checkout/payu/[id]/` | The hand-off page. |
| `src/app/api/payments/payu/return/route.ts` | Where the customer is posted back. |
| `src/app/api/payments/payu/webhook/route.ts` | Where PayU tells us independently. |
| `scripts/check-payu.ts` | The offline round-trip check. |

The salt appears in none of these except as an input to a hash. It is never
sent to the browser, never put in a form field, and never logged.

## Notes

- **The CSP must allow PayU.** `form-action` in `next.config.ts` lists both
  PayU hosts. Remove them and the browser blocks the payment form silently —
  no error anywhere, every payment dead on the last click.
- **`NEXT_PUBLIC_SITE_URL` must be the real https origin.** PayU rejects a
  return URL that is not publicly reachable, and builds the surl/furl from it.
- `PAYU_CLIENT_ID` / `PAYU_CLIENT_SECRET` are for PayU's newer REST APIs
  (payment links, refunds). The checkout does not use them; they are in
  `.env.example` so they are not hunted for later.
