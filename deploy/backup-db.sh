#!/usr/bin/env bash
# Takes a compressed dump of this checkout's database.
#
#   bash deploy/backup-db.sh              # → ~/backups/<db>-<timestamp>.dump
#   BACKUP_DIR=/mnt/x bash deploy/backup-db.sh
#
# deploy/deploy.sh calls this before it touches migrations, so there is always
# a restore point from immediately before the last release. Run it by hand too,
# before anything destructive — scripts/reset-store.ts above all.
#
# Restore (server):
#   pg_restore --clean --if-exists -d "$DATABASE_URL_WITHOUT_QUERY" backup.dump
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$APP_DIR"

BACKUP_DIR="${BACKUP_DIR:-$HOME/backups}"
KEEP="${KEEP:-14}"

[ -f .env ] || { echo "No .env in $APP_DIR — cannot find the database."; exit 1; }

# The value may contain '=' inside the query string, so take everything after
# the first one, then drop the query: libpq rejects Prisma's ?schema=public.
RAW_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2-)"
RAW_URL="${RAW_URL%\"}"; RAW_URL="${RAW_URL#\"}"
RAW_URL="${RAW_URL%\'}"; RAW_URL="${RAW_URL#\'}"
[ -n "$RAW_URL" ] || { echo "DATABASE_URL is not set in $APP_DIR/.env"; exit 1; }
CONN="${RAW_URL%%\?*}"

DB_NAME="$(basename "$CONN")"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${DB_NAME}-${STAMP}.dump"

command -v pg_dump >/dev/null || { echo "pg_dump is not installed (sudo apt install postgresql-client)"; exit 1; }

mkdir -p "$BACKUP_DIR"
pg_dump "$CONN" -Fc -f "$OUT"
echo "  backup → $OUT ($(du -h "$OUT" | cut -f1))"

# Keep the most recent KEEP dumps of this database; older ones go.
ls -1t "$BACKUP_DIR/${DB_NAME}-"*.dump 2>/dev/null | tail -n "+$((KEEP + 1))" | while read -r old; do
  rm -f "$old"
  echo "  pruned  $old"
done
