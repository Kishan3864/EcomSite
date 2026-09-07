# Admin module guide

How every admin module in `/admin` is built. Read this before adding one; copy the
**Brands** module (`src/services/admin/brands-actions.ts`, `src/app/admin/(dashboard)/brands/**`)
as the template — it is deliberately small and exercises every convention.

## Stack

- Next.js 16 App Router, React 19, TypeScript, Tailwind v4 (tokens in `src/app/globals.css`).
- Prisma 7 with the Postgres driver adapter. Client is generated to `src/generated/prisma`
  and exposed as `db` from `src/lib/db.ts`. Enum values are plain strings (`"ACTIVE"`).
- Schema: `prisma/schema.prisma`. Money is whole rupees (`Int`). Dates are `DateTime`.

## Layout of a module

```
src/services/admin/<module>-actions.ts      "use server" actions (writes)
src/app/admin/(dashboard)/<module>/page.tsx list page (server component)
src/app/admin/(dashboard)/<module>/new/page.tsx
src/app/admin/(dashboard)/<module>/[id]/page.tsx
src/app/admin/(dashboard)/<module>/<module>-form.tsx  "use client" form
```

Reads happen directly in the page with `db.*` — no extra read-service layer for admin.
Writes happen only in `*-actions.ts`.

## Server action shape

```ts
"use server";
export async function updateThing(id: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin("MANAGER");      // STAFF | MANAGER | OWNER
  const name = str(formData, "name");                  // helpers from ./shared
  if (name.length < 2) return { error: "Name is required.", field: "name" };
  const row = await db.thing.update({ where: { id }, data: { name } });
  await logActivity(session, { action: "thing.update", entity: "Thing", entityId: id, summary: `Updated ${row.name}` });
  revalidateStorefront();                              // if shoppers can see the change
  revalidateAdmin("things");
  return { ok: true, message: "Saved." };              // inline success on edit pages
}
```

- **Create** actions `redirect("/admin/<module>?flash=Created")` after writing.
- **Row actions** (delete, toggle, status change) take only `formData`, are wrapped in a
  plain `<form action={fn}>` or `<ConfirmForm>` and finish with a `redirect(...?flash=...)`
  or simply return after revalidating.
- Errors: return `{ error, field? }` from `useActionState` forms; for row actions redirect
  with `&tone=error`.
- Never trust prices/stock from the client — recompute from the database.
- Every write calls `logActivity` — the Activity log page depends on it.
- Roles: reading = STAFF; creating/editing = MANAGER; deleting, settings, team = OWNER.
  Check with `requireAdmin(role)` in actions and `hasRole(session, role)` to hide buttons.

## Helpers (`src/services/admin/shared.ts`)

`str num bool list lines dateOrNull slugify` — FormData parsing.
`parseListParams(raw, { perPage, defaultSort, filterKeys })`, `skipTake(params)`,
`pageMeta(total, params)`, `insensitive(q)` — list pages.
`revalidateStorefront(paths?)`, `revalidateAdmin(section?)`.
`FormState` / `INITIAL_FORM` live in `./form-state.ts` (client-safe — import that one in
client components; `shared.ts` is server-only).

## UI (`src/components/admin/ui.tsx`, server-safe)

`PageHeader Card StatCard Pill StatusPill Table Th Td Tr EmptyRow AdminPagination withParams
Money DateCell KeyValue FormSection Label FieldError` and the input class strings
`inputCls textareaCls selectCls selectArrow`.

`StatusPill status="DELIVERED"` knows every enum in the schema.

## UI (`src/components/admin/client.tsx`, client)

`SubmitButton ConfirmForm FlashMessage Notice SearchBox ParamSelect CopyButton PendingHint`.
The shell already renders `<FlashMessage />` above every page.

Storefront primitives you may reuse: `Button`/`buttonClasses` (`src/components/ui/button.tsx`),
`Field`/`Input`/`Select` (`src/components/ui/field.tsx`), `EmptyState`, `Price`, `Stars`
(`src/components/ui/primitives.tsx`), `formatINR formatDate formatDateTime cn`
(`src/lib/utils.ts`).

## List pages

- Read `searchParams` (a Promise in Next 16), parse with `parseListParams`.
- Search with `insensitive()`; filters through `ParamSelect`; paginate with `skipTake`.
- Render `<Table>`; link the primary column to the detail page; put row actions in the
  last column; finish with `<AdminPagination hrefFor={(p) => withParams(base, current, { page: p })} />`.

## Forms

- `"use client"`, uncontrolled inputs with `defaultValue`, `useActionState(action, INITIAL_FORM)`.
- The same form component serves create and edit: bind the id in the page
  (`updateThing.bind(null, row.id)`).
- Show `state.error` inline with `FieldError` when `state.field` matches, else in a `Notice`.
- Group fields in `FormSection`s; keep the primary submit at the bottom right.

## Design language

Same tokens as the storefront: `brand-*` (peacock), `gold-*`, `sale-*`, `ink-*`, `canvas`,
`surface`, `hairline`. Headings use `font-display`. Dense-but-airy: 13–13.5px body in tables,
`rounded-xl` cards, hairline borders, no heavy shadows. Icons: `lucide-react` at 14–16px.

## Don'ts

- No new dependencies.
- No client-side data fetching for lists — the page is the query.
- No `Date.now()`/`Math.random()` during render (use them inside actions only).
- Don't import `src/data/*` mock files in admin code; the database is the source of truth.
- Don't edit files outside your module's folders plus your `*-actions.ts` file unless the
  task says so.
