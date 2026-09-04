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

# Redeploy the change-request worker too, if it's set up (see setup-dev.sh /
# docs/AGENT_CONTRACT.md). Worker code lives in this same checkout
# (agent/worker.mjs), so a redeploy of natura should pick up its changes too.
if pm2 describe natura-agent >/dev/null 2>&1; then
  pm2 restart natura-agent --update-env
fi

pm2 save
echo "done — pm2 logs natura (and natura-agent, if running) to watch"
