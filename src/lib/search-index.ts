/**
 * Client-side search over a prepared index.
 *
 * The index is built on the server (see `services/search-docs.ts`) and handed
 * to the header as a prop, so the product catalogue — descriptions, specs,
 * reviews and all — never reaches the client bundle. Only these few fields do.
 *
 * When the catalogue outgrows even this, swap `searchDocs` for a debounced call
 * to a `/api/suggest` route: `SearchHit` is already the wire format.
 */

export interface SearchHit {
  type: "product" | "category" | "brand";
  label: string;
  sublabel: string;
  href: string;
  image?: string;
  price?: number;
}

/** Compact keys keep the serialised payload small. */
export interface SearchDoc {
  /** Lowercased text this document matches against. */
  k: string;
  /** Relevance multiplier. */
  w: number;
  hit: SearchHit;
}

export function searchDocs(docs: SearchDoc[], term: string, limit = 9): SearchHit[] {
  const q = term.trim().toLowerCase();
  if (!q) return [];

  const terms = q.split(/\s+/).filter(Boolean);
  const scored: { hit: SearchHit; score: number }[] = [];

  for (const doc of docs) {
    let score = 0;
    let matchedAll = true;

    for (const t of terms) {
      const at = doc.k.indexOf(t);
      if (at === -1) {
        matchedAll = false;
        break;
      }
      // Earlier matches are stronger: a title hit beats a tag hit.
      score += at === 0 ? 3 : at < 20 ? 2 : 1;
    }

    if (matchedAll) scored.push({ hit: doc.hit, score: score * doc.w });
  }

  return scored
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.hit);
}
