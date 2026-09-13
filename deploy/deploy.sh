#!/usr/bin/env bash
# Deploys (or updates) WeekendCart on the VPS. Safe to re-run.
#
#   cd ~/ecom.flexypdf.com       && bash deploy/deploy.sh              # live shop
#   cd ~/staging.weekendcart.com && bash deploy/deploy.sh staging      # rehearsal
#
# What it does, in order:
#   1. works out which of the two sites this checkout is
#   2. checks prerequisites
#   3. dumps the database (deploy/backup-db.sh) — the restore point
#   4. records the commit it is leaving, so deploy/rollback.sh can return to it
#   5. pulls that site's branch
#   6. installs dependencies (npm ci) and generates the Prisma client
#   7. applies pending migrations (prisma migrate deploy — never resets)
#   8. seeds the essentials only: first admin login and store settings.
#      The demo catalogue is NOT loaded; `npm run db:seed:demo` does that, and
#      it belongs on a development database only.
#   9. builds the Next.js app — a failure here stops the deploy with the
#      running site untouched, because PM2 is not reloaded until it passes
#  10. starts or zero-downtime-reloads the PM2 process
#  11. health-checks the port, and tells you how to roll back if it fails
#
# It never touches nginx, other PM2 apps, or the other site's directory.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m  %s\033[0m\n' "$*"; }

# ── 1. Which site is this? ────────────────────────────────────────────────
# Everything that differs between the live shop and the rehearsal copy is
# here and nowhere else. Both run from the same committed files.
TARGET="${1:-production}"
case "$TARGET" in
  production)
    export APP_ENV="production"
    export APP_NAME="weekendcart"
    export APP_PORT="3040"
    BRANCH="main"
    ;;
  staging)
    export APP_ENV="staging"
    export APP_NAME="weekendcart-staging"
    export APP_PORT="3041"
    BRANCH="staging"
    ;;
  *)
    echo "Unknown target '$TARGET'. Use: production (default) or staging."
    exit 1
    ;;
esac

printf '\n\033[1m%s\033[0m — branch %s, PM2 "%s", port %s\n' \
  "$(echo "$TARGET" | tr '[:lower:]' '[:upper:]')" "$BRANCH" "$APP_NAME" "$APP_PORT"
printf '  %s\n' "$APP_DIR"

# ── 2. Prerequisites ──────────────────────────────────────────────────────
step "Checking prerequisites"
command -v node >/dev/null || { echo "node is not installed. Install Node 20+ (e.g. via nvm) and re-run."; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node $NODE_MAJOR found; Node 20+ is required."; exit 1; }
command -v pm2 >/dev/null || { echo "pm2 is not installed: npm i -g pm2"; exit 1; }
[ -f .env ] || { echo ".env is missing. Copy .env.example to .env and fill DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL first."; exit 1; }
grep -q '^DATABASE_URL=' .env || { echo "DATABASE_URL is not set in .env"; exit 1; }
grep -q '^AUTH_SECRET=' .env || { echo "AUTH_SECRET is not set in .env"; exit 1; }

# The one mistake that would be expensive and silent: a staging checkout still
# pointed at the live database. Both sites keep working; staging edits would
# appear on the live shop.
if [ "$TARGET" = "staging" ] && grep -qE '^DATABASE_URL=.*/(mayura|weekendcart)(\?|"|$)' .env; then
  echo
  echo "  Refusing to deploy: this staging checkout's DATABASE_URL points at the"
  echo "  production database. Give staging its own database first — see"
  echo "  deploy/README.md, 'The staging site'."
  exit 1
fi

# ── 3. Restore point ──────────────────────────────────────────────────────
step "Backing up the database"
bash deploy/backup-db.sh

# ── 4. Where we are now ───────────────────────────────────────────────────
PREVIOUS="$(git rev-parse HEAD)"
echo "$PREVIOUS" > .last-release
step "Leaving $(git log -1 --format='%h — %s' "$PREVIOUS")"

# ── 5. New code ───────────────────────────────────────────────────────────
step "Pulling $BRANCH"
git fetch --quiet origin
git reset --hard --quiet "origin/$BRANCH"
git log -1 --format='  at %h — %s'

step "Installing dependencies"
npm ci --no-audit --no-fund

step "Applying database migrations"
npx prisma migrate deploy

step "Seeding the essentials (admin login, store settings)"
npm run db:seed

step "Building"
npm run build

step "Starting / reloading PM2 process '$APP_NAME'"
mkdir -p logs
if pm2 describe "$APP_NAME" >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

step "Health check"
sleep 3
if curl -fsS -o /dev/null -w "  HTTP %{http_code} from http://127.0.0.1:$APP_PORT/\n" "http://127.0.0.1:$APP_PORT/"; then
  echo "  Deployed. If nginx is not configured yet, see deploy/README.md."
else
  warn "The app did not answer on $APP_PORT."
  warn "Logs:     pm2 logs $APP_NAME --lines 50"
  warn "Roll back: bash deploy/rollback.sh $TARGET"
  exit 1
fi
