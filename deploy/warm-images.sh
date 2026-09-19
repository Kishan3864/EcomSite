#!/usr/bin/env bash
# Encodes the images shoppers are about to ask for, before they ask.
#
#   bash deploy/warm-images.sh [port]        (default 3040; 3041 is staging)
#
# The shared cache (deploy/link-image-cache.mjs) is the real fix for the 504s:
# a deploy no longer empties the cache. This is the second line — it covers the
# first deploy after that change, new products, and new image widths. It reads
# the homepage, the listing and every product page in the sitemap, takes the
# /_next/image URLs out of their HTML — exactly the variants the pages offer a
# browser, nothing guessed — and requests each one once, as a browser that
# accepts AVIF would.
#
# Three at a time: enough to finish in a few minutes, few enough to leave the
# optimiser free for real visitors while it runs. Capped at six minutes overall.
#
# IT CANNOT FAIL A DEPLOY. Every failure in here is swallowed and it always
# exits 0; deploy.sh additionally runs it with `|| true`.
set +e
PORT="${1:-3040}"
BASE="http://127.0.0.1:$PORT"
LIST="$(mktemp)"; trap 'rm -f "$LIST"' EXIT
# Widths above this are for very large screens; they are encoded on demand.
MAX_W=1440
MAX_PAGES=60

pages() {
  echo "/"; echo "/products"
  curl -s -m 20 "$BASE/sitemap.xml" | grep -o '<loc>[^<]*</loc>' | sed -E 's#</?loc>##g; s#^https?://[^/]+##' | grep '^/p/' | head -n "$MAX_PAGES"
}

pages | while read -r path; do
  curl -s -m 30 -A "Mozilla/5.0 (deploy warm-up)" "$BASE$path" \
    | grep -o '/_next/image?url=[^ "]*' | sed 's/&amp;/\&/g'
done | sort -u | awk -v max="$MAX_W" '{ w = $0; sub(/.*[?&]w=/, "", w); sub(/&.*/, "", w); if (w + 0 <= max) print }' > "$LIST"

TOTAL="$(wc -l < "$LIST" | tr -d ' ')"
if [ "$TOTAL" = "0" ]; then echo "  image warm-up: nothing to warm (no pages answered) — skipped"; exit 0; fi
echo "  image warm-up: $TOTAL variants, 3 at a time…"
START=$(date +%s)
export BASE
timeout 360 xargs -P 3 -I{} sh -c 'curl -s -o /dev/null -m 60 -H "Accept: image/avif,image/webp,image/*,*/*;q=0.8" -w "%{http_code}\n" "$BASE{}"' < "$LIST" \
  | sort | uniq -c | awk '{ printf "    %s × HTTP %s\n", $1, $2 }'
echo "  image warm-up: done in $(( $(date +%s) - START )) s (a slow or failed variant is simply encoded on first request instead)"
exit 0
