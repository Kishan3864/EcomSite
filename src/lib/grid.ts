/**
 * How many columns a short grid should use.
 *
 * A fixed column count is right for a listing, where there are always more
 * items than columns and only the last row is ever short. It is wrong for the
 * small grids — a department's collections, a page's three facts — where the
 * whole grid may be shorter than one row. Four columns holding two things is
 * two things and two holes.
 *
 * Columns are chosen to fill the rows evenly rather than run to the maximum:
 * the row count is taken first and divided back. Six items in a four-column
 * maximum become 3x2 rather than a full row above a half-empty one; five become
 * 3+2; seven become 4+3. The last row is then full, or one short of it, always.
 *
 *   balancedColumns(2, 4) → 2      balancedColumns(6, 4) → 3
 *   balancedColumns(3, 4) → 3      balancedColumns(7, 4) → 4
 *   balancedColumns(5, 4) → 3      balancedColumns(9, 4) → 3
 */
export function balancedColumns(count: number, max: number): number {
  if (count <= 0) return 1;
  const rows = Math.max(1, Math.ceil(count / max));
  return Math.max(1, Math.ceil(count / rows));
}

/**
 * Tailwind cannot see a class name that is built at runtime, so the ones this
 * returns are written out in full for its scanner to find.
 */
const COLS: Record<number, string> = {
  1: "sm:grid-cols-1",
  2: "sm:grid-cols-2",
  3: "sm:grid-cols-3",
  4: "sm:grid-cols-4",
  5: "sm:grid-cols-5",
  6: "sm:grid-cols-6",
};

/** The `sm:` column class for a grid of `count` items, capped at `max`. */
export function balancedColumnClass(count: number, max: number): string {
  return COLS[balancedColumns(count, max)] ?? COLS[max] ?? "sm:grid-cols-4";
}
