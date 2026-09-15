/**
 * A corner marker on every copy of the site that is not the live shop.
 *
 * Staging runs the same code, the same design and the same admin panel as
 * production; the only thing that differs is the hostname, and a hostname is
 * easy to lose track of in a tab strip. The expensive mistakes — deleting a
 * product, refunding an order, running the reset script — all start with
 * being on the wrong one of the two.
 *
 * It renders only when APP_ENV is set to something other than "production",
 * so a live box that has never heard of APP_ENV shows nothing.
 */
export function EnvironmentBadge() {
  const env = process.env.APP_ENV;
  if (!env || env === "production") return null;

  return (
    <div
      // Bottom left: the top is the header, and on phones the bottom right is
      // where the nav's own controls sit.
      className="pointer-events-none fixed bottom-2 left-2 z-[95] select-none"
      aria-hidden
    >
      {/* Ink with a gold rule around it rather than a rose chip: rose
          is reserved for price reductions, and a shadow would make this the one
          thing on the site that floats. A gold edge is still the loudest
          thing in the corner of a page drawn entirely in hairlines. */}
      <span className="block bg-ink-950 px-2 py-1 text-[11px] font-semibold uppercase leading-none tracking-[0.14em] text-gold-300">
        {env}
      </span>
    </div>
  );
}
