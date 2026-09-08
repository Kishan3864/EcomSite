export const meta = {
  name: 'mayura-admin-build-batch',
  description: 'Build a batch of admin/storefront modules in parallel (resumable, disjoint file ownership)',
  phases: [{ title: 'Build', detail: 'one agent per module in this batch' }],
}

const PREAMBLE = `
You are building part of "Mayura", a Next.js 16 (App Router, React 19, TypeScript, Tailwind v4, Prisma 7 + Postgres) e-commerce project at C:\\EcomSite. A working storefront and an admin shell already exist. Your job is ONE module, described below. Other agents are building other modules in parallel in the same working tree, so file ownership is strict.

RESUMING AN INTERRUPTED BUILD: an earlier attempt at your module was cut off part-way. Files may already exist inside the paths you own; they type-check and lint clean but were never verified in a browser and may be incomplete. Read every existing file in your owned paths FIRST, keep what is correct, fix what is wrong, and build what is missing. Do not delete and restart unless the existing code is genuinely unusable — say so in your output if you did.

FIRST, read these (they are short and authoritative):
  1. C:\\EcomSite\\docs\\admin-module-guide.md   — conventions every module follows
  2. C:\\EcomSite\\prisma\\schema.prisma          — the data model (DO NOT change it)
  3. The reference module, copy its patterns exactly:
     C:\\EcomSite\\src\\services\\admin\\brands-actions.ts
     C:\\EcomSite\\src\\app\\admin\\(dashboard)\\brands\\page.tsx
     C:\\EcomSite\\src\\app\\admin\\(dashboard)\\brands\\brand-form.tsx
     C:\\EcomSite\\src\\app\\admin\\(dashboard)\\brands\\[id]\\page.tsx
  4. Shared primitives you may use (read, never edit):
     C:\\EcomSite\\src\\components\\admin\\ui.tsx, C:\\EcomSite\\src\\components\\admin\\client.tsx
     C:\\EcomSite\\src\\services\\admin\\shared.ts, C:\\EcomSite\\src\\services\\admin\\form-state.ts
     C:\\EcomSite\\src\\lib\\auth\\admin.ts (requireAdmin/hasRole/logActivity), C:\\EcomSite\\src\\lib\\db.ts
     C:\\EcomSite\\src\\lib\\utils.ts (formatINR, formatDate, cn, statusLabel)

HARD RULES
- Only create/edit files inside the paths you OWN (listed below). Do not touch prisma/schema.prisma, src/components/admin/*, src/services/admin/shared.ts, src/lib/*, src/app/layout.tsx, package.json, or any other module's folders. If you genuinely need something outside your ownership, do NOT edit it — describe it precisely in "needsFromOwner" and build the rest.
- Never run git commands. Do not install packages. Do not run "next build" or "next dev" (a dev server is already running at http://localhost:3000 — use it; it hot-reloads). Validate with: npx tsc --noEmit 2>&1 | grep -v "^.next/types"   and   npx eslint <your files>. Both must be clean for your files before you finish.
- Admin auth for browser testing: email admin@mayura.in, password Mayura@2026 (role OWNER). Demo customer: ananya.iyer@example.in / Ananya@2026. Playwright is installed in C:\\tmp (run scripts with: cd /c/tmp && node yourscript.mjs). In the admin shell the FIRST button[type=submit] in the DOM is the topbar sign-out button — scope clicks to 'main form button[type=submit]' or a more specific selector. Local DB for checks: "C:/Program Files/PostgreSQL/16/bin/psql" -U mayura -h localhost -p 5433 -d mayura -tAc "<sql>".
- Prisma client: import { db } from "@/lib/db". Enum values are string literals like "ACTIVE". Reads happen in server components; writes only in your *-actions.ts ("use server"). Never trust prices/stock from the client. Every write calls logActivity and revalidateAdmin(...); writes that shoppers can see also call revalidateStorefront().
- Roles: reading STAFF, create/edit MANAGER, delete/settings/team OWNER. Hide buttons with hasRole(session, role) and enforce with requireAdmin(role) in actions.
- Money is whole rupees (Int). Format with formatINR. Dates: formatDate / formatDateTime.
- Match the existing design language (reference module + src/components/admin/ui.tsx). Dense but airy, hairline borders, rounded-xl cards, lucide icons 14–16px, font-display headings via PageHeader. No new dependencies.
- Quality bar: production software a store owner runs daily. Real validation messages, empty states, pagination, confirm dialogs on destructive actions, no dead buttons, no "coming soon".
- Work efficiently: read only what you need, write complete files in one go, and keep your own browser test script short. When done, run tsc + eslint on your files, then a real browser check of your pages via Playwright against http://localhost:3000 (log in first), fix anything broken, and only then return.

YOUR FINAL OUTPUT (via the StructuredOutput tool): module, files created/changed, a factual summary of what works as verified, anything unfinished, and needsFromOwner (exact edits needed in files you do not own, if any).
`;

const OUTPUT = {
  type: 'object',
  properties: {
    module: { type: 'string' },
    files: { type: 'array', items: { type: 'string' } },
    summary: { type: 'string' },
    verified: { type: 'string', description: 'What you actually tested and how (tsc/eslint/browser), with results' },
    unfinished: { type: 'string' },
    needsFromOwner: { type: 'array', items: { type: 'string' } },
  },
  required: ['module', 'files', 'summary', 'verified', 'unfinished', 'needsFromOwner'],
}

const SPECS = {
  products: `MODULE: Products (admin catalogue management). You OWN: src/services/admin/products-actions.ts and everything under src/app/admin/(dashboard)/products/**. (products-actions.ts and products/product-schema.ts already exist from the interrupted run — read and reuse them.)

Build:
1. /admin/products — list: search (title/sku/slug/brand name), filters status (DRAFT/ACTIVE/ARCHIVED), category, brand (accept ?brand=<slug> and ?category=<slug> from links elsewhere), stock state (in stock / low / out), sort (updated, price, stock, sold), pagination. Columns: thumbnail + title + sku, brand, category/subcategory, price + mrp, stock (red when <= lowStockThreshold), status pill, updated. Row actions: edit, duplicate, archive/unarchive, delete (OWNER; refuse if the product has order lines — archive instead). Bulk actions via checkboxes: set status ACTIVE/DRAFT/ARCHIVED for selected (a small client component that submits selected ids to a server action).
2. /admin/products/new and /admin/products/[id] — one form component ("use client", useActionState) covering EVERY Product field in the schema: title, slug (auto from title if blank; unique), sku (unique), subtitle, description (textarea), status, price, mrp (must be >= price), stock, lowStockThreshold, badges (multi-checkbox of ProductBadge), tags (comma list), colors (comma list), highlights (one per line), specifications (dynamic editor: groups with label/value rows — submit as JSON in a hidden field), deliveryDays, codAvailable, returnWindowDays, warranty, freeShipping, videoPoster, metaTitle, metaDescription, brand select, category select, subcategory select (filtered by chosen category — pass subcategories as a prop and filter client-side), images (dynamic list of {url, alt}, reorder up/down, remove; submit as JSON), variant groups (dynamic: group name + type COLOR/SIZE/STORAGE/OPTION; options label/value/swatch/priceDelta/inStock; submit as JSON), related products and bundle products (multi-select from a searchable list — pass a compact list of {id,title,sku} of ACTIVE products as a prop; store via ProductRelation with kind RELATED / BUNDLE). Persist child rows transactionally: replace images/variantGroups/relations on save. Edit page sidebar: status, live storefront link (/p/<slug>), sold count, rating/reviewCount, created/updated, recent stock movements (last 5), danger zone (archive / delete).
3. Actions: createProduct, updateProduct(id,…), duplicateProduct, setProductStatus (single + bulk), deleteProduct. Stock changes from the form write a StockMovement row (delta, reason "Manual edit"). Validate everything server-side with clear field errors. Any change calls revalidateStorefront(["/p/<slug>"]).`,

  categories: `MODULE: Categories & subcategories. You OWN: src/services/admin/categories-actions.ts and everything under src/app/admin/(dashboard)/categories/**. (categories-actions.ts already exists from the interrupted run — read and reuse it.)

Build:
1. /admin/categories — list every category (ordered by sortOrder): image thumb, name, slug, menuLabel, product count, subcategory count, active pill, sortOrder with move up/down actions. "Add category" link.
2. /admin/categories/new and /admin/categories/[id] — form with all Category fields: name, slug (auto), menuLabel, icon (text; lucide icon name), accent (color input + hex text), description, imageUrl + imageAlt (live preview), highlights (one per line, max 4), featuredBrandSlugs (multi-checkbox from Brand table), sortOrder, isActive.
3. On the category edit page, manage its subcategories in a table: add (name, slug, description, imageUrl, imageAlt), edit (inline or a small /admin/categories/[id]/subcategories/[subId] page), reorder, toggle active, delete (refuse if products exist, with a clear message).
4. Actions: create/update/delete category, reorder, toggle active; create/update/delete/reorder subcategory. Deleting a category with products must be refused. All writes call revalidateStorefront() (categories appear in the header mega menu and footer).`,

  orders: `MODULE: Orders. You OWN: src/services/admin/orders-actions.ts and everything under src/app/admin/(dashboard)/orders/**. (orders/workflow.ts already exists from the interrupted run — read and reuse it.)

Build:
1. /admin/orders — list: search (order number, contact name/email/phone, AWB), filters status, paymentStatus, paymentMethod, date range (from/to), pagination (25), sort by placedAt. Columns: number (link), placed at, customer (name + email; link to /admin/customers/<id> when customerId exists), items count, total, payment (method + status pill), status pill, ETA. Summary strip above the table with counts by status for the current filter. A "Needs attention" quick filter (CONFIRMED older than 24h, or COD_PENDING delivered).
2. /admin/orders/[id] — full detail: header with number, status pill, payment pill, placed time, "Print / invoice" link (a /admin/orders/[id]/invoice page rendering a clean printable invoice with GST breakup). Sections: line items (image, title, variant, qty, unit price, line total; link to /admin/products/<productId> when present), totals block, customer & contact, shipping address, delivery (speed, name, scheduledDate, giftWrap, courier, AWB — editable inline form), timeline of OrderEvents (newest first) plus a form to add a manual event (title/description/location), returns linked to this order, admin note (editable), customer note.
3. Status workflow with validated transitions: CONFIRMED→PACKED→SHIPPED→OUT_FOR_DELIVERY→DELIVERED; any non-delivered order can be CANCELLED (reason required). Each transition creates an OrderEvent with sensible title/description/location and sets deliveredAt / cancelledAt. Cancelling restocks every line (product.stock += qty, soldCount -= qty, StockMovement reason "Order cancelled", reference = order number) and sets paymentStatus to REFUNDED (if PAID) or FAILED (if COD_PENDING). "Mark COD as paid" action for COD orders. Buttons only show valid transitions.
4. Actions: advanceOrderStatus, cancelOrder, setShipment (courier, awb, estimatedDelivery), addOrderEvent, setAdminNote, markCodPaid. Every action logs activity and calls revalidateAdmin("orders") plus revalidatePath("/order/<id>") and revalidatePath("/track/<id>").`,

  customers: `MODULE: Customers. You OWN: src/services/admin/customers-actions.ts and everything under src/app/admin/(dashboard)/customers/**. (customers-actions.ts, customers/customer-form.tsx and customers/customer-meta.tsx already exist from the interrupted run — read and reuse them.)

Build:
1. /admin/customers — list: search (name/email/phone), filter tier, filter "has account" (passwordHash not null) vs guest, sort by createdAt / order count / lifetime spend (aggregate over orders where status != CANCELLED), pagination. Columns: name + email, phone, tier pill, orders count, lifetime spend, last order date, joined, active pill.
2. /admin/customers/[id] — profile card (name, email, phone, tier, loyaltyPoints, joined, last login, account vs guest), editable form (name, phone, tier, loyaltyPoints, isActive, internal notes), stats (orders, spend, AOV, returns), addresses list, orders table (link to /admin/orders/<id>), returns list, reviews list (with status), danger zone: deactivate/reactivate (blocks login), "Anonymise" (OWNER; replaces name/email/phone with redacted values, removes addresses, keeps orders — real GDPR-style action with confirm).
3. Actions: updateCustomer, setCustomerActive, anonymiseCustomer. Log activity for each.`,

  returns: `MODULE: Returns & refunds. You OWN: src/services/admin/returns-actions.ts and everything under src/app/admin/(dashboard)/returns/**. (returns-actions.ts, returns/page.tsx, returns/[id]/page.tsx and helper/form files already exist from the interrupted run — read them, verify in the browser, fix and complete.)

Required behaviour:
1. /admin/returns — list: filter by status, search (order number, customer name/email, product title), sort by requestedAt, pagination. Columns: request id (short), order number (link to /admin/orders/<id>), product (thumb + title), customer, reason, refund amount, status pill, requested at, age. Summary counts by status above.
2. /admin/returns/[id] — detail: product + order line snapshot, order link, customer, reason + details, refund amount (editable while REQUESTED/APPROVED, cannot exceed line total), refund mode, admin note, timeline derived from requestedAt/resolvedAt/status.
3. Workflow actions with validated transitions: approve (REQUESTED→APPROVED, optional note), reject (REQUESTED→REJECTED, note required), markPickedUp (APPROVED→PICKED_UP), refund (PICKED_UP→REFUNDED: sets resolvedAt, restocks the line quantity with a StockMovement reason "Return refunded", updates the parent order paymentStatus to PARTIALLY_REFUNDED, or REFUNDED if every line is now refunded; if every line is refunded also set order.status = RETURNED and add an OrderEvent). Buttons show only valid transitions. Every action logs activity and revalidates /admin/returns, /admin/orders/<orderId>, and /account/returns.`,

  reviews: `MODULE: Reviews & Q&A moderation. You OWN: src/services/admin/reviews-actions.ts and everything under src/app/admin/(dashboard)/reviews/**. (reviews-actions.ts already exists from the interrupted run — read and reuse it.)

Build:
1. /admin/reviews — two tabs via ?tab=reviews|questions (default reviews; render as pill links).
   Reviews tab: filter status (PENDING/APPROVED/HIDDEN), rating, search (product title, author, text), sort newest, pagination. Columns: product (thumb + title, link to /admin/products/<id>), author + location + verified badge, rating stars, title + excerpt (expand on click via a small client component), status pill, date. Row actions: approve, hide, delete (OWNER). Bulk approve/hide for selected rows.
   Questions tab: filter status (PENDING/ANSWERED/HIDDEN), search; columns product, question, asked by, answer (or "Unanswered"), status, date. Inline answer form per row (textarea; answeredBy defaults to the admin's name) setting status ANSWERED and answeredAt. Actions: answer, hide, delete.
2. Whenever a review's status changes, recompute the parent product's rating (average of APPROVED reviews, 1 decimal) and reviewCount (count of APPROVED) in the same transaction, and revalidateStorefront(["/p/<slug>"]).`,

  marketing: `MODULE: Marketing — coupons/offers and banners. You OWN: src/services/admin/offers-actions.ts, src/services/admin/banners-actions.ts, and everything under src/app/admin/(dashboard)/offers/** and src/app/admin/(dashboard)/banners/**. (Nothing exists yet — build from the reference pattern.)

Offers:
1. /admin/offers — list: search code/title, filter type and active/expired/scheduled, pagination. Columns: code (with CopyButton), title, type pill, value (₹ or %), min spend, max discount, category scope, valid window, used/limit, status (Active / Expired / Scheduled / Inactive). Row actions: edit, toggle active, delete (OWNER; refuse if usedCount > 0 — deactivate instead).
2. /admin/offers/new and /admin/offers/[id] — form: code (uppercase, unique), title, description, type (PERCENT/FLAT/SHIPPING/BANK), value, minSpend, maxDiscount (optional), category (optional select), accent color, startsAt, expiresAt (after startsAt), usageLimit (optional), isActive. Live "preview" card mimicking the storefront coupon card.
Banners:
3. /admin/banners — grouped by placement (HERO, MID, PROMO_TILE) with image preview, title, href, sort order (move up/down), schedule, active pill; add/edit/delete/toggle/reorder. Storefront expectations: HERO = full-width carousel slides (eyebrow, title, subtitle, cta, href, image, align left|right, theme dark), MID = feature banners (theme light|dark), PROMO_TILE = square tiles (title, subtitle, cta, href, image).
4. /admin/banners/new and /admin/banners/[id] — form with placement, eyebrow, title, subtitle, cta, href (must start with /), imageUrl (+ live preview), imageAlt, align, theme, sortOrder, startsAt/endsAt (optional), isActive.
All writes revalidateStorefront() (home and offers pages read these).`,

  inventory: `MODULE: Inventory. You OWN: src/services/admin/inventory-actions.ts and everything under src/app/admin/(dashboard)/inventory/** (including a route handler at src/app/admin/(dashboard)/inventory/export/route.ts). (inventory-actions.ts, inventory/inventory-shared.ts and inventory/query.ts already exist from the interrupted run — read and reuse them.)

Build:
1. /admin/inventory — stock table for ACTIVE and DRAFT products: search title/sku, filters category, stock state (all / low = stock <= lowStockThreshold / out = 0 / healthy), sort by stock asc/desc, pagination. Accept ?stock=low from dashboard links. Columns: thumb + title + sku, category, stock (bold, red when low, sale pill "Out" when 0), lowStockThreshold, sold, last movement (date + delta), and an inline "Adjust" control per row: a small client form with delta (+/-) and reason select (Received stock, Damaged, Correction, Returned to supplier, Other + free text) posting to adjustStock. Summary tiles at the top: total SKUs, low stock count, out of stock count, total units.
2. /admin/inventory/[productId] — movement ledger for one product: product header, current stock, adjust form, paginated StockMovement table (date, delta, running balance, reason, reference — link order numbers to /admin/orders?q=<number>, actor).
3. /admin/inventory/export — GET route handler returning CSV (sku,title,category,stock,threshold,status) with Content-Disposition attachment; return 401 JSON if getAdminSession() is null. "Export CSV" button on the list.
4. Actions: adjustStock(productId, delta, reason, note) — writes StockMovement, updates product.stock (never below 0; error if it would), logs activity, revalidateStorefront(["/p/<slug>"]). setThreshold(productId, value).`,

  messages: `MODULE: Inbox — contact messages and newsletter subscribers. You OWN: src/services/admin/messages-actions.ts and everything under src/app/admin/(dashboard)/messages/** (including messages/subscribers/export/route.ts). (All of these already exist from the interrupted run — read them, verify in the browser, fix and complete anything missing.)

Required behaviour:
1. /admin/messages — list of ContactMessage: filter status (NEW/REPLIED/CLOSED), topic select (distinct topics), search (name/email/order number/message), sort newest, pagination. Columns: status pill, from (name + email), topic, order number (link to /admin/orders?q=<number>), excerpt, received. Summary tiles: new today, awaiting reply, replied this week.
2. /admin/messages/[id] — full message, reply form (stores reply + repliedAt + status REPLIED — no email is sent in this phase; say so in a small note), "Close" and "Reopen" actions, context panel: matching Customer (name/tier/order count with links) and matching Order (status with link).
3. /admin/messages/subscribers — NewsletterSubscriber list with search, count, source, subscribed date, remove action (OWNER), "Export CSV" → GET route handler returning email,source,createdAt (401 JSON when not signed in).
4. Actions: replyToMessage, setMessageStatus, deleteSubscriber. Log activity. To test, insert a ContactMessage via psql or the storefront /contact form.`,

  settings: `MODULE: Settings, team and activity log. You OWN: src/services/admin/settings-actions.ts, src/services/admin/team-actions.ts, and everything under src/app/admin/(dashboard)/settings/** and src/app/admin/(dashboard)/activity/**. (Nothing exists yet.)

Settings (/admin/settings — OWNER edits; MANAGER/STAFF see a read-only view with a notice):
1. Tabs via ?tab=store|shipping|payments|tax|inventory|team|profile (pill links). Read values with getSettings() and save with saveSetting(key, value) from C:\\EcomSite\\src\\services\\settings.ts (read that file). Forms: store (name, legalName, tagline, supportEmail, supportPhone, address, gstin, currency read-only INR); shipping (freeThreshold, standardFee, expressFee, scheduledFee, standardDays [min,max], expressDays [min,max], validate min<=max); payments (toggles upi/card/netbanking/wallet/cod + codLimit); tax (gstRate 0–28, pricesIncludeTax); inventory (lowStockThreshold, allowBackorders). Each saves via a server action, logs activity ("settings.update" with the key), and calls revalidateStorefront().
2. team tab (OWNER): AdminUser table (name, email, role pill, active, last login, created); "Add user" form (name, email, role, temporary password shown once — hash with hashPassword from src/lib/auth/password.ts); actions: change role, deactivate/reactivate, reset password (new temporary password shown once), "Sign out everywhere" (increment tokenVersion). An OWNER cannot demote/deactivate themselves; at least one active OWNER must remain.
3. profile tab (any role): change own name; change own password (current password required; validate with verifyPassword/passwordProblem from src/lib/auth/password.ts).
Activity (/admin/activity, any role):
4. Paginated ActivityLog table (newest first): time, actor, action (monospace), entity + id (link to the entity's admin page when entity is Product/Order/Customer/Brand/Category/Offer/Banner/ReturnRequest), summary, expandable metadata JSON. Filters: entity select, actor select, action prefix search, date range.`,

  'store-checkout': `MODULE: Storefront — checkout, orders and tracking wired to the database. You OWN: src/store/store.tsx, src/lib/order-builder.ts (delete it), everything under src/app/(store)/checkout/**, src/app/(store)/order/**, src/app/(store)/track/**, src/app/(store)/cart/**, and src/components/checkout/** and src/components/cart/**. (Nothing has been changed yet in these paths; another agent owns account/auth/contact pages and the header — do not edit those.)

Context: phase 1 stored orders in localStorage. Now orders must be created in Postgres through the server action placeOrder(input) in C:\\EcomSite\\src\\services\\commerce.ts (read it — it re-prices from the DB, validates coupons/stock, writes Order + lines + first OrderEvent, decrements stock, remembers guest orders in a signed cookie). Reads come from C:\\EcomSite\\src\\services\\orders.ts (getOrderForViewer, lookupOrder, getCustomerOrders, getCustomerAddresses). Settings from getSettings() in src/services/settings.ts. Customer session: getCustomerSession() in src/lib/auth/customer.ts; guest order ids: getGuestOrderIds(). Address actions saveAddress/removeAddress in commerce.ts.

Do:
1. src/store/store.tsx — stop seeding demo data: initial addresses = [] and orders = []; remove the demoOrders/savedAddresses imports; keep cart/saved/wishlist/recent/checkout draft/coupon/recentSearches in localStorage. Replace \`pendingOrder: Order | null\` with \`pendingCheckout: PlaceOrderInput | null\` (import the type from services/commerce.ts as a type only) plus an action "checkout/stage". Remove the "order/place" action and the local orders list; add "checkout/complete" that clears cart, coupon, pendingCheckout and the payment fields. Keep hydration/persistence logic intact. Anything else in the repo that imported orders/pendingOrder from the store is inside your owned paths — update it.
2. Checkout steps (contact, address, delivery, payment, review, processing): keep the existing UI and flow. Contact: if a customer session exists (fetch in page.tsx, pass as prop), prefill and show "Signed in as …". Address: if signed in, show DB addresses (server-fetched prop) with add/edit/delete via saveAddress/removeAddress (call the actions, then router.refresh()); if a guest, keep the local address list. Delivery: derive the three options from settings (fees + day ranges) passed as props instead of the static deliveryOptions constant. Payment: hide methods disabled in settings; COD unavailable above settings.payments.codLimit. Review: build a PlaceOrderInput (cart lines, contact, address snapshot, deliveryId, deliveryDate, giftWrap, paymentMethod, paymentDetail, couponCode) → dispatch "checkout/stage" → push /checkout/processing. Processing: read pendingCheckout, show the existing staged animation, call placeOrder(pendingCheckout); on success dispatch "checkout/complete" and router.replace("/order/<orderId>?placed=1"); on failure show the error with a "Back to review" button (do NOT bounce to /cart on failure). Keep the StrictMode-safe latch pattern already there.
3. src/app/(store)/order/[id]/page.tsx — server component: getOrderForViewer(id); notFound() when null; pass the Order to order-client.tsx refactored to take the order as a prop (keep animations, copy button, print, "Track this order"). Remove useStore there.
4. src/app/(store)/track/** — /track: form with order number + email-or-phone posting to a server action you add (e.g. src/app/(store)/track/actions.ts calling lookupOrder) that redirects to /track/<id>; list "recent orders on this device" server-side via getGuestOrderIds()+getOrderForViewer and the signed-in customer's orders via getCustomerOrders. /track/[id]: server component, getOrderForViewer, notFound when null, render the existing TrackDetail UI with the order as a prop (refactor away from useStore).
5. Cart page: keep client-side coupon evaluation against offers from the server, but take the free-shipping threshold and standard fee from settings (pass settings into CartClient; build the delivery object from settings). Do not edit src/lib/pricing.ts — adapt at the call site.
6. Delete src/lib/order-builder.ts and remove its imports. Do not import demo customer/addresses/orders from src/data anywhere in your files (static option lists like INDIAN_STATES, upiApps, banks, wallets, paymentMethods labels are fine).
7. Verify with Playwright end to end: add product → cart → coupon MAYURA10 → contact (guest) → address (add new) → delivery → payment (UPI) → review → processing → order page shows a DB order number MYR-2026-00xxxx → /track/<id> works → /track lookup by number + email works → the product's stock decreased by 1 in the DB. Also verify a failing case: a coupon below minimum spend is rejected at placeOrder with the error shown on the processing screen.`,

  'store-account': `MODULE: Storefront — accounts, auth, contact, newsletter, reviews, header session. You OWN: everything under src/app/(store)/account/**, src/app/(store)/login/**, src/app/(store)/register/**, src/app/(store)/forgot-password/**, src/app/(store)/contact/**, src/app/(store)/offers/page.tsx, src/app/(store)/p/**, src/components/account/**, src/components/layout/header.tsx, src/components/layout/header-client.tsx, src/components/layout/footer.tsx, src/components/product/reviews.tsx, plus new files you create under src/components/product/ or src/components/layout/ prefixed "account-", "review-" or "newsletter-". (Nothing has been changed yet; another agent owns checkout/order/track/cart/store.tsx — do not edit those or src/store/store.tsx.)

Available server APIs (read them): src/services/commerce.ts (loginAction, registerAction, logoutAction, updateProfile, saveAddress, removeAddress, requestReturn, submitReview, submitContact, subscribeNewsletter), src/services/orders.ts (getCustomerOrders, getCustomerReturns, getCustomerAddresses, getCustomerProfile, getOrderForViewer), src/lib/auth/customer.ts (getCustomerSession, requireCustomer), src/services/catalog.ts (getBanners).

Do:
1. /login and /register: real forms with useActionState(loginAction / registerAction) — keep the AuthShell design and inline errors (state.field/state.error); support ?next= via a hidden input; remove the fake OTP tab entirely. /forgot-password stays UI-only but says honestly that reset email is not connected yet. Add a small "Demo account: ananya.iyer@example.in / Ananya@2026" hint on the login page.
2. Account area (/account, /account/orders, /account/orders/[id], /account/returns, /account/addresses): each page calls requireCustomer(pathname) and reads from the DB services. Overview: real profile + stats + latest order + default address + recent returns. Orders list: getCustomerOrders (keep the filter pills UI as a client component taking orders as props). Order detail: getOrderForViewer (notFound when missing/foreign). Returns: getCustomerReturns; "Start a return" from delivered orders' lines calling requestReturn then router.refresh(). Addresses: getCustomerAddresses + saveAddress/removeAddress (default via isDefault true). Add a profile section to edit name/phone via updateProfile and a "Sign out" button using logoutAction. Update src/components/account/account-nav.tsx to show the real profile (props from a server component) with a working sign-out form.
3. Header: src/components/layout/header.tsx also calls getCustomerSession() and passes { name } | null to HeaderClient, which shows "Hi, <first name>" linking to /account (mobile drawer welcome panel shows the name + a sign-out form) instead of "Sign in" when present. Keep everything else in the header as is.
4. Footer newsletter form → small client component "newsletter-form.tsx" calling subscribeNewsletter with pending/success/error states inline.
5. Contact form → submitContact from the existing contact-form.tsx (keep the design, map state.field errors).
6. Product page reviews: add a "Write a review" panel (in reviews.tsx or a new review-form.tsx imported by the PDP) — signed-in customers get a form (stars, title, body) calling submitReview then "Thanks — your review is awaiting moderation"; guests see "Sign in to review" linking to /login?next=/p/<slug>. The PDP page fetches getCustomerSession() and passes a boolean.
7. Offers page: replace the midBanners import from src/data/marketing with getBanners() (use banners.mid[0]).
8. Do not import the demo customer/savedAddresses/returnRequests/demoOrders from src/data in files you own.
9. Verify with Playwright: register a new customer (unique email) → lands on /account → add an address → sign out → sign in as ananya.iyer@example.in → /account/orders shows the 3 seeded orders → /account/orders/ord_4691 renders → returns page lists 2 seeded returns → header shows "Hi, Ananya" → newsletter subscribe stores a row (psql check) → contact form stores a ContactMessage → review form on a product stores a PENDING review.`,
}

const wanted = Array.isArray(args?.modules) && args.modules.length ? args.modules : Object.keys(SPECS)
const missing = wanted.filter((k) => !SPECS[k])
if (missing.length) throw new Error('Unknown modules: ' + missing.join(', '))

phase('Build')
log(`Building batch: ${wanted.join(', ')}`)

const results = await parallel(
  wanted.map((key) => () =>
    agent(PREAMBLE + '\n\n' + SPECS[key], { label: `build:${key}`, phase: 'Build', schema: OUTPUT })
      .then((r) => r ?? { module: key, files: [], summary: 'AGENT RETURNED NULL', verified: '', unfinished: 'agent died or was skipped', needsFromOwner: [] })
  ),
)

const needs = results.flatMap((r) => (r.needsFromOwner || []).map((n) => `[${r.module}] ${n}`))
const unfinished = results.filter((r) => r.unfinished && r.unfinished.trim() && !/^(none|nothing|n\/a)\b/i.test(r.unfinished.trim())).map((r) => `[${r.module}] ${r.unfinished}`)
log(`Batch done. ${needs.length} owner requests, ${unfinished.length} modules report unfinished work`)

return { results, needs, unfinished }