#!/usr/bin/env bash
# Puts a site back on the commit it was running before the last deploy.
#
#   bash deploy/rollback.sh                     # this checkout, previous release
#   bash deploy/rollback.sh staging             # the staging checkout
#   bash deploy/rollback.sh production 77ed828  # a specific commit
#
# Code only. The database is deliberately left alone: a rollback usually means
# a page is broken, not that the data is wrong, and dropping today's orders to
# fix a layout would be the worse mistake. If a migration really does have to
# come out, restore the dump deploy/deploy.sh took immediately before it:
#
#   pg_restore --clean --if-exists -d "postgresql://USER:PASS@localhost:5432/DB" \
#     ~/backups/DB-YYYYMMDD-HHMMSS.dump
#
# Detached HEAD afterwards is expected and correct — the checkout is pinned to
# a known-good commit until the next deploy moves it back onto the branch.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

TARGET="${1:-production}"
case "$TARGET" in
  production) export APP_ENV="production" APP_NAME="weekendcart"         APP_PORT="3040" ;;
  staging)    export APP_ENV="staging"    APP_NAME="weekendcart-staging" APP_PORT="3041" ;;
  *) echo "Unknown target '$TARGET'. Use: production (default) or staging."; exit 1 ;;
esac

SHA="${2:-}"
if [ -z "$SHA" ]; then
  [ -f .last-release ] || {
    echo "No .last-release here — this checkout has not been deployed by deploy.sh yet."
    echo "Pass the commit to go back to:  bash deploy/rollback.sh $TARGET <sha>"
    exit 1
  }
  SHA="$(cat .last-release)"
fi

git rev-parse --quiet --verify "$SHA^{commit}" >/dev/null || {
  echo "Unknown commit '$SHA'. Try: git fetch origin && git log --oneline -20"
  exit 1
}

printf '\n\033[1mROLLING BACK %s\033[0m\n' "$TARGET"
echo "  from  $(git log -1 --format='%h — %s')"
echo "  to    $(git log -1 --format='%h — %s' "$SHA")"

step "Checking out $SHA"
git checkout --quiet --detach "$SHA"

step "Installing dependencies"
npm ci --no-audit --no-fund

# Migrations are not reversed: prisma migrate deploy only ever rolls forward,
# and the schema an older build reads is almost always a superset it tolerates.
#
# Built out of the way and swapped in, same as deploy.sh: a rollback is run
# when the site is already in trouble, and rebuilding on top of what it is
# still serving would take it off the air for the length of the build.
step "Building (into .next-build)"
rm -rf .next-build
NEXT_DIST_DIR=.next-build npm run build

step "Swapping the finished build into place"
rm -rf .next-prev
[ -d .next ] && mv .next .next-prev
mv .next-build .next

step "Reloading PM2 process '$APP_NAME'"
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

step "Health check"
sleep 3
curl -fsS -o /dev/null -w "  HTTP %{http_code} from http://127.0.0.1:$APP_PORT/\n" "http://127.0.0.1:$APP_PORT/" \
  || { echo "  Still not answering. pm2 logs $APP_NAME --lines 50"; exit 1; }

echo
echo "  Back on $(git log -1 --format='%h — %s')."
echo "  Fix the problem on a branch, merge it, then deploy again."
