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

## If the webhook never arrives

The browser return is the fast path and the webhook is the reliable one, but
neither is guaranteed: a phone dies on the bank page, hotel wifi eats a
redirect, a webhook is never registered or never delivered. In all of those
the money moved and only PayU knows.

So the shop asks. `reconcilePayuOrder` calls PayU's `verify_payment` API for
any attempt open longer than three minutes and applies the answer through the
same `applyVerdict` the webhook uses, so the three sources cannot disagree.
It runs:

- when a customer opens their own unpaid order, and
- across everything outstanding when the admin orders list is drawn.

Both are throttled to one question per attempt per window, and both are silent
when PayU cannot be reached, so the page renders either way. This is the one
part of the integration that needs this server to reach PayU — and nothing a
customer is waiting on depends on it, because it runs afterwards.

**A working webhook still makes the shop quicker** and costs nothing to
register, so register it. But an order will not sit unpaid for want of one.

A transaction PayU has never seen answers with the literal status `Not Found`.
That is not a verdict about a payment — it means nobody ever started one — and
is read as nothing at all.

## The webhook

PayU dashboard → **Developers → Webhooks → Create Webhook**. Make **two**,
both pointing at the same URL:

| Type | Event | Webhook URL |
|---|---|---|
| Payments | **Successful** | `https://weekendcart.com/api/payments/payu/webhook` |
| Payments | **Failed** | `https://weekendcart.com/api/payments/payu/webhook` |

*Refund* and *Dispute* are not handled yet — leave them until refunds are
automated, or they will simply be ignored.

PayU posts these as form-url-encoded fields carrying the same reverse hash as
the browser return, so the same verification and the same idempotent path
handle both. The route always answers 200: a gateway that reads an error code
retries for hours, and there would be nothing for it to fix.

**Why it matters.** The browser return is the fast path; this is the reliable
one. A phone that dies on the bank page, a tab closed the moment the UPI app
said yes, a redirect eaten by hotel wifi — in every one of those the customer
has paid and only the webhook can say so.

While `PAYU_MODE=test`, register the webhook in the dashboard's **Test Mode**;
the live dashboard keeps its own separate list.

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

- **The CSP must allow every PayU host, not just the one the form names.**
  `form-action` in `next.config.ts` allows `https://*.payu.in`. It governs the
  whole redirect chain, and posting to `test.payu.in/_payment` lands on
  `apitest.payu.in/public/` — name only the first and the browser refuses the
  second. The console then blames the URL the form named, which makes it look
  like the policy is already correct when it is not.
- **`NEXT_PUBLIC_SITE_URL` must be the real https origin.** PayU rejects a
  return URL that is not publicly reachable, and builds the surl/furl from it.
- `PAYU_CLIENT_ID` / `PAYU_CLIENT_SECRET` are for PayU's newer REST APIs
  (payment links, refunds). The checkout does not use them; they are in
  `.env.example` so they are not hunted for later.
