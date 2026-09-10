#!/usr/bin/env bash
# Deploys (or updates) WeekendCart on the VPS. Safe to re-run.
#
#   ssh flexyuser@srv1545707
#   git clone https://github.com/Kishan3864/EcomSite.git ~/ecom.flexypdf.com   # first time only
#   cd ~/ecom.flexypdf.com && bash deploy/deploy.sh
#
# What it does, in order:
#   1. pulls the latest main
#   2. installs dependencies (npm ci) and generates the Prisma client
#   3. applies pending database migrations (prisma migrate deploy — never resets)
#   4. seeds only if the catalogue is empty
#   5. builds the Next.js app
#   6. starts or zero-downtime-reloads the PM2 process "weekendcart"
#
# It never touches nginx, other PM2 apps, or other directories.
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

step "Checking prerequisites"
command -v node >/dev/null || { echo "node is not installed. Install Node 20+ (e.g. via nvm) and re-run."; exit 1; }
NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
[ "$NODE_MAJOR" -ge 20 ] || { echo "Node $NODE_MAJOR found; Node 20+ is required."; exit 1; }
command -v pm2 >/dev/null || { echo "pm2 is not installed: npm i -g pm2"; exit 1; }
[ -f .env ] || { echo ".env is missing. Copy .env.example to .env and fill DATABASE_URL, AUTH_SECRET, NEXT_PUBLIC_SITE_URL first."; exit 1; }
grep -q '^DATABASE_URL=' .env || { echo "DATABASE_URL is not set in .env"; exit 1; }
grep -q '^AUTH_SECRET=' .env || { echo "AUTH_SECRET is not set in .env"; exit 1; }

step "Pulling latest code"
git fetch --quiet origin
git reset --hard --quiet origin/main
git log -1 --format='  at %h — %s'

step "Installing dependencies"
npm ci --no-audit --no-fund

step "Applying database migrations"
npx prisma migrate deploy

step "Seeding if the catalogue is empty"
PRODUCT_COUNT="$(npx --yes tsx -e 'import "dotenv/config"; import {PrismaPg} from "@prisma/adapter-pg"; import {PrismaClient} from "./src/generated/prisma/client"; const db=new PrismaClient({adapter:new PrismaPg({connectionString:process.env.DATABASE_URL})}); db.product.count().then(n=>{console.log(n);return db.$disconnect()})' 2>/dev/null | tail -1)"
if [ "${PRODUCT_COUNT:-0}" = "0" ]; then
  npm run db:seed
else
  echo "  $PRODUCT_COUNT products already present — skipping seed"
fi

step "Building"
npm run build

step "Starting / reloading PM2 process 'weekendcart'"
mkdir -p logs
if pm2 describe weekendcart >/dev/null 2>&1; then
  pm2 reload deploy/ecosystem.config.cjs --update-env
else
  pm2 start deploy/ecosystem.config.cjs
fi
pm2 save >/dev/null

step "Health check"
sleep 3
if curl -fsS -o /dev/null -w '  HTTP %{http_code} from http://127.0.0.1:3040/\n' http://127.0.0.1:3040/; then
  echo "  Deployed. If nginx is not configured yet, see deploy/README.md."
else
  echo "  App did not answer on 3040 — check: pm2 logs weekendcart --lines 50"
  exit 1
fi
