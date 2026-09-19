#!/usr/bin/env bash
# Encodes the images shoppers are about to ask for, before they ask.
#
#   bash deploy/warm-images.sh [port]        (default 3040; 3041 is staging)
#
# The shared cache (deploy/link-image-cache.mjs) is the real fix for the 504s:
# a deploy no longer empties the cache. This is the second line — it covers new
# products and new image widths. It reads the homepage, the listing and every
# product page in the sitemap, takes the /_next/image URLs out of their HTML —
# exactly the variants the pages offer a browser, nothing guessed — and requests
# each one once, as a browser that accepts AVIF would.
#
# Three at a time: enough to finish in a few minutes, few enough to leave the
# optimiser free for real visitors while it runs. Capped at six minutes overall.
#
# It says what it did at every step — pages asked and how they answered, image
# variants found, how each answered, and the cache before and after — and when
# it warms nothing it says WHICH step came back empty, because "skipped" on its
# own tells nobody whether the app, the sitemap or the pages were the reason.
#
# IT CANNOT FAIL A DEPLOY. Every failure in here is swallowed and it always
# exits 0; deploy.sh additionally runs it with `|| true`.
set +e
PORT="${1:-3040}"
BASE="http://127.0.0.1:$PORT"
APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CACHE="$APP_DIR/shared/next-image-cache"
WORK="$(mktemp -d)"; trap 'rm -rf "$WORK"' EXIT
# Widths above this are for very large screens; they are encoded on demand.
MAX_W=1440
MAX_PAGES=60

say() { echo "  image warm-up: $*"; }
cache_state() {
  if [ -d "$CACHE" ]; then
    echo "$(du -sh "$CACHE" 2>/dev/null | cut -f1) in $(find "$CACHE" -type f 2>/dev/null | wc -l | tr -d ' ') files"
  else
    echo "no shared cache at shared/next-image-cache (this release keeps its own)"
  fi
}

# The app may redirect a request whose Host is not the shop's own. Ask as the
# shop's public host, over what the app should believe is https.
HOST="$(grep -E '^NEXT_PUBLIC_SITE_URL=' "$APP_DIR/.env" 2>/dev/null | head -1 | sed -E 's/^[^=]+=//; s/^"//; s/"$//; s#^https?://##; s#/.*$##')"
ask() { curl -s -m 30 -A "Mozilla/5.0 (deploy warm-up)" ${HOST:+-H "Host: $HOST"} -H "X-Forwarded-Proto: https" "$@"; }

say "cache before: $(cache_state)"

# 1. Which pages.
SITEMAP_CODE="$(ask -o "$WORK/sitemap.xml" -w '%{http_code}' "$BASE/sitemap.xml")"
{ echo "/"; echo "/products"
  grep -o '<loc>[^<]*</loc>' "$WORK/sitemap.xml" 2>/dev/null | sed -E 's#</?loc>##g; s#^https?://[^/]+##' | grep '^/p/' | head -n "$MAX_PAGES"
} > "$WORK/pages"
PRODUCT_PAGES="$(grep -c '^/p/' "$WORK/pages")"
say "sitemap.xml answered HTTP ${SITEMAP_CODE:-none}; $PRODUCT_PAGES product pages in it (plus / and /products)"

# 2. What those pages offer.
: > "$WORK/urls"; : > "$WORK/codes"
while read -r path; do
  code="$(ask -o "$WORK/page.html" -w '%{http_code}' "$BASE$path")"
  echo "${code:-none}" >> "$WORK/codes"
  [ "$code" = "200" ] && grep -o '/_next/image?url=[^ "]*' "$WORK/page.html" | sed 's/&amp;/\&/g' >> "$WORK/urls"
done < "$WORK/pages"
say "pages answered: $(sort "$WORK/codes" | uniq -c | awk '{ printf "%s%s × HTTP %s", (NR > 1 ? ", " : ""), $1, $2 }')"

FOUND="$(sort -u "$WORK/urls" | wc -l | tr -d ' ')"
sort -u "$WORK/urls" | awk -v max="$MAX_W" '{ w = $0; sub(/.*[?&]w=/, "", w); sub(/&.*/, "", w); if (w + 0 <= max) print }' > "$WORK/list"
TOTAL="$(wc -l < "$WORK/list" | tr -d ' ')"
say "$FOUND distinct image variants offered by those pages; $TOTAL at or under ${MAX_W}px to warm"

# 3. Nothing to do? Say which step was empty.
if [ "$TOTAL" = "0" ]; then
  if ! grep -q '^200$' "$WORK/codes"; then
    say "SKIPPED — no page answered HTTP 200 on port $PORT (see the codes above). '000' means nothing is listening there; 301/308 means the app redirected this request; 503 means maintenance mode is on, which is expected and harmless."
  elif [ "$FOUND" = "0" ]; then
    say "SKIPPED — the pages answered, but their HTML offers no /_next/image URLs. Either every photo is a remote URL (those bypass the optimiser) or images.unoptimized is on."
  else
    say "SKIPPED — every variant offered is wider than ${MAX_W}px."
  fi
  exit 0
fi

# 4. Warm.
START=$(date +%s)
export BASE
timeout 360 xargs -P 3 -I{} sh -c 'curl -s -o /dev/null -m 60 -H "Accept: image/avif,image/webp,image/*,*/*;q=0.8" -w "%{http_code}\n" "$BASE{}"' < "$WORK/list" > "$WORK/results"
DONE="$(wc -l < "$WORK/results" | tr -d ' ')"
say "requested $DONE of $TOTAL in $(( $(date +%s) - START )) s: $(sort "$WORK/results" | uniq -c | awk '{ printf "%s%s × HTTP %s", (NR > 1 ? ", " : ""), $1, $2 }')"
[ "$DONE" -lt "$TOTAL" ] && say "stopped at the six-minute cap; the remaining $(( TOTAL - DONE )) are encoded on first request instead"
say "cache after:  $(cache_state)"
exit 0
