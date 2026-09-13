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
      <span className="block bg-sale-600 px-2 py-1 text-[9.5px] font-bold uppercase leading-none tracking-[0.16em] text-white shadow-lg">
        {env}
      </span>
    </div>
  );
}
