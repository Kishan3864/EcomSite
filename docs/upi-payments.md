# Taking payment by UPI, without a gateway

The shop can accept UPI — Google Pay, PhonePe, Paytm, any of them — paid
straight into its own bank account, with no payment gateway in between. This
page is how it works, what it costs, and what it cannot do.

## Why this exists

In India a website cannot collect money online by itself. Either a licensed
payment aggregator (PayU, Cashfree, PhonePe PG, Paytm PG) collects it and
passes it on, or the customer pays you directly by UPI and somebody checks the
bank. Google Pay is not a third option — it is a UPI app, and every gateway
already offers it as one of its methods.

This is the second route. It is a **bridge**, not a destination: it works the
day you switch it on, with no onboarding and no commission, and it costs you a
manual check on every order. Move to a gateway when the orders outgrow that.

## What the customer sees

1. **Checkout → How would you like to pay?** — "UPI — Google Pay, PhonePe,
   Paytm", with the three steps spelled out before they choose it.
2. **Order placed** — stock is reserved and the order exists, unpaid.
3. **`/checkout/upi/<order>`** — the amount, a QR drawn on our own server, and
   (on a phone) buttons that open Google Pay, PhonePe, Paytm or any UPI app
   with the amount and order number already filled in. The UPI id and amount
   can be copied by hand as a fallback.
4. They pay in their own app, and enter the **12-digit UTR** it gives them.
5. The page says we are checking, and **updates itself** when you confirm.

If they close the page, the order is still there: **My orders → Pay now**, and
the same link is in the email they get if a reference is rejected.

## What you do

A payment lands in the verify queue and an email reaches
`BUSINESS.supportEmail` immediately, with the amount and the UTR.

1. Open the order in `/admin/orders`.
2. The **Payment to confirm** card shows the amount and the reference.
3. **Find that reference for that amount in your bank or UPI app.**
4. **Yes, ₹… received** → the order becomes paid and confirmed, the customer is
   emailed, and it moves into the normal packing flow.
   **Not in my bank** → the reference is cleared and the customer is told to
   send the right one. The order and its stock are kept; this is not a
   cancellation, because the usual cause is a mistyped digit.

**Never confirm on the customer's word.** Twelve digits typed into a form are a
claim. The only thing that makes them money is seeing the credit.

## Switching it on

**1. A business UPI id.** Use one issued for the business — Google Pay for
Business, PhonePe for Business, or one your bank gave you for the current
account. Collecting shop payments into a personal UPI id breaks the bank's own
terms and is a common way for accounts to get frozen.

**2. Put it in `.env`** — Server (VPS):

```
cd ~/ecom.flexypdf.com && nano .env
```

```
UPI_VPA="yourshop@okhdfcbank"
UPI_PAYEE_NAME="Weekend Cart"
```

**3. Choose which methods the checkout offers** — Server (VPS):

```
npx tsx scripts/payment-methods.ts upi     # UPI only
npx tsx scripts/payment-methods.ts         # just show what is on
pm2 reload weekendcart
```

Accepts any of `upi`, `gateway`, `cod`. The same switches are in
/admin → Settings. A method with no working credentials is hidden from the
checkout rather than offered as a dead end, and the script says so.

## What it cannot do

- **No automatic confirmation.** Every payment waits on you. At five or ten
  orders a day that is a few minutes; at fifty it is a job.
- **No automatic refunds.** You refund by sending money back from your own app,
  then cancel the order in the admin panel.
- **No chargeback protection or dispute process.** A UPI transfer is final.
- **A wrong UTR is only caught by you.** The same reference cannot be used on
  two orders — that is checked — but a plausible-looking invented one will sit
  in the queue until you look at the bank and reject it.

## How an order moves

| Payment status | Means |
|---|---|
| `PENDING` | Order placed, nothing reported. Released after 12 hours and the stock returns. |
| `VERIFYING` | A reference is in. **No clock** — it waits for you, indefinitely. |
| `PAID` | You found the money. Order is `CONFIRMED` and ready to pack. |

A UPI order that was released and then confirmed is revived and its stock
taken back, the same way a late gateway payment is — check availability before
you dispatch that one. The admin card and the order timeline both say so.

## Where the code is

| File | Role |
|---|---|
| `src/lib/payments/upi.ts` | The `upi://pay` link, the app-specific links, the QR, the UTR check. No database. |
| `src/services/payments-upi.ts` | The customer's actions: report a reference, poll for confirmation. |
| `src/services/admin/upi-actions.ts` | Confirm and reject. The only place an order becomes paid. |
| `src/app/(store)/checkout/upi/[id]/` | The payment page. |
| `src/app/admin/(dashboard)/orders/order-forms.tsx` | The **Payment to confirm** card (`UpiVerifyForm`). |
| `src/services/storefront-config.ts` | Decides which methods the checkout offers. |
| `scripts/payment-methods.ts` | Turns them on and off from the command line. |

Nothing here talks to the internet, which is the other reason it works on this
server: no outbound call has to succeed for a customer to pay.

## Moving to a gateway later

Nothing has to be undone. Add the gateway's keys, run
`npx tsx scripts/payment-methods.ts upi gateway` to offer both, watch which one
customers pick, and drop `upi` from that command when you no longer want the
manual route. Orders already paid by UPI keep their history either way.
