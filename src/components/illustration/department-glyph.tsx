"use client";

import { DrawIn } from "@/components/ui/motion";
import { Ink, drawnPath } from "@/components/illustration/ink";

/* ------------------------------------------------------------------ *
 * The department marks that replaced the category photographs.
 *
 * A photograph of "Home & Living" was always a lie — it showed one sofa
 * and implied the whole department, and it cost a network round trip to
 * say so. A drawn mark says "department" instead of "this product", and
 * it is the same three kilobytes whether it appears at 20px in the
 * mobile drawer or at 200px on a category page.
 *
 * Every glyph shares the "0 0 48 48" viewBox and puts every vertex on a
 * 4-unit grid, so the set is interchangeable: a caller can swap one for
 * another without the optical weight of the row shifting. The grid is
 * coarse on purpose. It is what stops a hand-drawn set from drifting
 * into nine slightly different drawings.
 * ------------------------------------------------------------------ */

/** The draw is deliberately quicker than the page's section reveals — a mark
 *  this small looks laboured if it takes as long as a hero. */
const DRAW_MS = 600;

/** Enough of a gap that the detail reads as landing *on* the outline, and not
 *  so much that the two halves look like separate events. */
const STAGGER_MS = 60;

/**
 * Every glyph is an outline plus, usually, its detail. Splitting them lets the
 * silhouette arrive first and the detail settle into it, which is the whole
 * reason the set is drawn rather than faded in.
 *
 * The stroke weight is restated here rather than left to the root <svg>,
 * because DEPARTMENT_GLYPHS is exported for callers who drop a mark straight
 * into an <svg> of their own and would otherwise inherit whatever that one set.
 */
function Marks({
  strokeWidth,
  main,
  detail,
}: {
  strokeWidth: number;
  main: string[];
  detail?: string[];
}) {
  return (
    <g strokeWidth={strokeWidth}>
      <DrawIn duration={DRAW_MS}>
        {main.map((d) => (
          <path key={d} d={d} {...drawnPath} />
        ))}
        {detail && (
          <DrawIn duration={DRAW_MS} delay={STAGGER_MS}>
            {detail.map((d) => (
              <path key={d} d={d} {...drawnPath} />
            ))}
          </DrawIn>
        )}
      </DrawIn>
    </g>
  );
}

type GlyphProps = { strokeWidth: number };

/* Electronics. The cable bends with a single quadratic whose control point sits
 * on the grid like every vertex, so the curve cannot drift off it either. */
function PlugGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M16 16H32V28H16Z"]}
      detail={["M20 16V8M28 16V8", "M24 28V32Q24 40 16 40"]}
    />
  );
}

/* The pins are the only thing that separates this from a plain square, so all
 * twelve stay even though they cost more commands than any other mark. They are
 * split by axis so no single path carries the lot. */
function CpuGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M12 12H36V36H12Z"]}
      detail={[
        "M20 20H28V28H20Z",
        "M16 12V8M24 12V8M32 12V8M16 36V40M24 36V40M32 36V40",
        "M12 16H8M12 24H8M12 32H8M36 16H40M36 24H40M36 32H40",
      ]}
    />
  );
}

/* One closed outline carries the collar, both shoulders and both cuffs. A
 * separate collar path would read as a second garment at menu size. */
function ShirtGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks strokeWidth={strokeWidth} main={["M8 16L16 8H20L24 12L28 8H32L40 16L32 24V40H16V24Z"]} />
  );
}

/* No legs: at 20px they collapse into the baseline and only add noise. The
 * arms sitting lower than the back is what makes this read as a sofa. */
function SofaGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M8 36V20H12V12H36V20H40V36H8"]}
      detail={["M12 20V36M36 20V36", "M12 28H36"]}
    />
  );
}

/* The three lobes are stepped rather than domed. Curves here would be the one
 * place in the set that argues with the square-corner policy. */
function ChefHatGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M12 28V20H20V16H28V20H36V28Z"]}
      detail={["M16 28V36H32V28"]}
    />
  );
}

/* One drawn star plus two struck ones. A four-point star small enough to read
 * as "small" cannot be built from an eight-vertex polygon on a 4-unit grid, so
 * the two lesser sparkles are crossed strokes instead. */
function SparklesGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M20 8L24 16L32 20L24 24L20 32L16 24L8 20L16 16Z"]}
      detail={["M36 4V20M28 12H44M36 32V40M32 36H40"]}
    />
  );
}

/* The girdle counts as the first of the three facet lines; without it the two
 * diagonals look like a cracked hexagon rather than a cut stone. */
function GemGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M24 8L40 16V32L24 40L8 32V16Z"]}
      detail={["M8 16H40", "M16 16L24 40M32 16L24 40"]}
    />
  );
}

/* Plates are taller than they are wide, which is the difference between a
 * dumbbell and a bone. */
function DumbbellGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M16 24H32"]}
      detail={["M8 16H16V32H8Z", "M32 16H40V32H32Z"]}
    />
  );
}

/* Both pages are open at the spine and the spine is drawn last, so the book
 * appears to open and then bind rather than the other way round. */
function BookOpenGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M24 12L8 16V36L24 32", "M24 12L40 16V36L24 32"]}
      detail={["M24 12V32"]}
    />
  );
}

/* The fallback. A department nobody has drawn a mark for is still a department
 * of things in boxes, so an open carton is honest rather than apologetic — far
 * better than a question mark or an empty cell. */
function CartonGlyph({ strokeWidth }: GlyphProps) {
  return (
    <Marks
      strokeWidth={strokeWidth}
      main={["M8 16H40V40H8Z"]}
      detail={["M8 16L4 8H20L24 16", "M40 16L44 8H28L24 16"]}
    />
  );
}

/**
 * Keyed by the kebab-case icon string a category carries. The names match the
 * Lucide vocabulary the admin already uses, so a department created in the
 * admin panel picks up the drawn mark with no extra mapping — and anything
 * outside this set falls back to the carton rather than breaking the row.
 */
export const DEPARTMENT_GLYPHS: Record<string, (p: { strokeWidth: number }) => React.JSX.Element> = {
  plug: PlugGlyph,
  cpu: CpuGlyph,
  shirt: ShirtGlyph,
  sofa: SofaGlyph,
  "chef-hat": ChefHatGlyph,
  sparkles: SparklesGlyph,
  gem: GemGlyph,
  dumbbell: DumbbellGlyph,
  "book-open": BookOpenGlyph,
  package: CartonGlyph,
};

export function DepartmentGlyph({
  icon,
  size,
  strokeWidth,
  className,
}: {
  icon: string;
  size?: number;
  strokeWidth?: number;
  className?: string;
}) {
  // A weight that suits a 24px menu glyph turns a 200px one into a cartoon, and
  // the weight that suits the large one vanishes in the menu. One threshold is
  // enough: the set is only ever used small in navigation or large on a landing
  // page, never in between. A caller that sizes the mark from a className gets
  // the heavier weight, because the two mistakes are not equal — too heavy is
  // merely a bit blunt, too light at 20px is invisible.
  const weight = strokeWidth ?? (size !== undefined && size > 72 ? 1 : 1.5);
  const Glyph = DEPARTMENT_GLYPHS[icon] ?? CartonGlyph;

  return (
    <Ink viewBox="0 0 48 48" size={size} strokeWidth={weight} className={className}>
      <Glyph strokeWidth={weight} />
    </Ink>
  );
}
