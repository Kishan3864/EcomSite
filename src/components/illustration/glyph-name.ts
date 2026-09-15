/**
 * The mark a piece of writing asks for, when nothing has chosen one for it.
 *
 * Subcategories carry no icon of their own, so every collection in a
 * department used to inherit its parent's mark — four identical drawings in a
 * row, which reads as a bug rather than as a family. Rather than add a field
 * and an admin control for something the words already say, the name is read:
 * "Kitchen appliances" asks for the kettle and "Home care" for the spray
 * bottle, and anything that matches nothing falls back to whatever the caller
 * had in mind.
 *
 * Deliberately blunt. It is a presentation nicety, not a taxonomy, and the
 * moment it needs a rule it does not have, the honest answer is to give
 * subcategories a real icon field.
 *
 * This lives apart from `department-glyph.tsx` because that file is a client
 * module, and *every* export of a client module — a plain function included —
 * reaches the server as a reference to be rendered, not as something to call.
 * A server component that called it got "Attempted to call glyphNameFor() from
 * the server", which is a 500 on the category page rather than a build error.
 * A module with no "use client" on it is callable from both sides, which is
 * what a lookup table over strings should be.
 */
const KEYWORD_GLYPHS: [test: RegExp, glyph: string][] = [
  [/kitchen|cook|chef|kettle|grind|mixer|blend|brew|food/i, "kettle"],
  [/clean|care|vacuum|laundry|wash|hygiene|mop/i, "spray"],
  [/appliance|machine|fridge|refriger|microwave/i, "appliance"],
  [/home|living|house|decor|furnish/i, "home"],
  [/electronic|gadget|tech|audio|computer|laptop|mobile/i, "cpu"],
  [/fashion|cloth|apparel|wear|shirt/i, "shirt"],
  [/furniture|sofa|seat/i, "sofa"],
  [/beauty|skin|grooming|personal/i, "sparkles"],
  [/jewel|gold|silver|ornament/i, "gem"],
  [/fit|sport|gym|train|outdoor/i, "dumbbell"],
  [/book|stationer|paper|read/i, "book-open"],
];

export function glyphNameFor(text: string): string | null {
  for (const [test, glyph] of KEYWORD_GLYPHS) if (test.test(text)) return glyph;
  return null;
}
