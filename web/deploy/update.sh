#!/usr/bin/env bash
# Redeploy NATURA 2030 on the VPS after pushing to the chatbot branch.
#   ~/code/natura2030/web/deploy/update.sh
set -euo pipefail

export PATH="$HOME/.local/share/pnpm/bin:$PATH"
cd "$(dirname "$0")/.."

git pull --ff-only
pnpm install --frozen-lockfile
SELF_HOSTED=true pnpm build
pm2 restart natura --update-env
pm2 save
echo "done — pm2 logs natura to watch"
