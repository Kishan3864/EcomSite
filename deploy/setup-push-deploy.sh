#!/usr/bin/env bash
# Sets up push-to-deploy on this box. Run once. Safe to re-run.
#
#   bash deploy/setup-push-deploy.sh
#
# It creates a bare repository next to the app, installs the post-receive hook
# into it, and teaches the app directory to fetch from it. Nothing here touches
# the network, which is the point: the server cannot reach github.com, so the
# code comes the other way — pushed from a machine that can.
#
# Afterwards, from your PC (once):
#
#   git remote add production ssh://flexyuser@187.127.141.107/home/flexyuser/weekendcart.git
#
# and from then on, every deploy is one command:
#
#   git push production main
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BARE="${DEPLOY_BARE_REPO:-$HOME/weekendcart.git}"

step() { printf '\n\033[1;36m▸ %s\033[0m\n' "$*"; }

step "Bare repository at $BARE"
if [ -d "$BARE" ]; then
  echo "  already there"
else
  git init --bare --quiet "$BARE"
  echo "  created"
fi

# A push to the branch that is currently checked out in a non-bare repo is
# refused; a bare repo has no checkout, so this is only belt and braces.
git --git-dir="$BARE" config receive.denyCurrentBranch ignore

step "Installing the post-receive hook"
install -m 755 "$APP_DIR/deploy/post-receive" "$BARE/hooks/post-receive"
echo "  $BARE/hooks/post-receive"

step "Pointing the app directory at it"
cd "$APP_DIR"
if git remote | grep -qx local; then
  git remote set-url local "$BARE"
else
  git remote add local "$BARE"
fi
git remote -v | sed 's/^/  /'

step "Seeding the bare repo with what is checked out here"
# So the first push has a common ancestor and sends only what is new.
git push --quiet local "HEAD:refs/heads/main" 2>/dev/null || true
git --git-dir="$BARE" log -1 --format='  at %h — %s' 2>/dev/null || echo "  (empty — the first push will fill it)"

cat <<EOF

Done. On your PC, once — use the same host you SSH to:

  git remote add production ssh://$(whoami)@YOUR.SERVER.IP$BARE

Then every deploy is one command, from your PC:

  git push production main

EOF
