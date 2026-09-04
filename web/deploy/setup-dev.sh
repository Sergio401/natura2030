#!/usr/bin/env bash
# One-time (idempotent) setup for the dev preview + change-request agent.
#
# Run on the VPS as `sergio`:
#   cd ~/code/natura2030/web/deploy && ./setup-dev.sh
# or, while `chatbot` is still the prod branch:
#   PROD_BRANCH=chatbot ./setup-dev.sh
#
# Creates the `dev` branch (from PROD_BRANCH) and a git worktree for it at
# ~/code/natura2030-dev, builds it, and starts the `natura-dev` and
# `natura-agent` pm2 apps. Does NOT touch nginx/certbot or sudo — see the
# printed commands at the end. Safe to re-run.
set -euo pipefail

PROD_BRANCH="${PROD_BRANCH:-main}"
DEV_BRANCH="${DEV_BRANCH:-dev}"

export PATH="$HOME/.local/share/pnpm/bin:$HOME/.local/bin:$PATH"

REPO_DIR="$HOME/code/natura2030"
WORKTREE_DIR="$HOME/code/natura2030-dev"
AGENT_DATA_DIR="$HOME/natura-agent"

echo "== natura2030 dev setup (PROD_BRANCH=$PROD_BRANCH DEV_BRANCH=$DEV_BRANCH) =="

cd "$REPO_DIR"
git fetch origin

# --- ensure the dev branch exists locally, tracking origin if it's already there ---
if git show-ref --verify --quiet "refs/heads/$DEV_BRANCH"; then
  echo "-- local branch '$DEV_BRANCH' already exists"
elif git ls-remote --exit-code --heads origin "$DEV_BRANCH" >/dev/null 2>&1; then
  echo "-- creating local '$DEV_BRANCH' tracking origin/$DEV_BRANCH"
  git branch "$DEV_BRANCH" "origin/$DEV_BRANCH"
else
  echo "-- creating '$DEV_BRANCH' from origin/$PROD_BRANCH"
  git branch "$DEV_BRANCH" "origin/$PROD_BRANCH"
fi

# --- ensure the worktree exists ---
if [ -d "$WORKTREE_DIR" ]; then
  echo "-- worktree already exists at $WORKTREE_DIR"
else
  echo "-- adding worktree at $WORKTREE_DIR"
  git worktree add "$WORKTREE_DIR" "$DEV_BRANCH"
fi

# --- push dev to origin if it isn't there yet ---
if git ls-remote --exit-code --heads origin "$DEV_BRANCH" >/dev/null 2>&1; then
  echo "-- origin/$DEV_BRANCH already exists"
else
  echo "-- pushing $DEV_BRANCH to origin"
  git push -u origin "$DEV_BRANCH"
fi

# --- .env for the worktree ---
cd "$WORKTREE_DIR/web"
if [ -f .env ]; then
  echo "-- $WORKTREE_DIR/web/.env already exists, leaving it alone"
else
  if [ -f "$REPO_DIR/web/.env" ]; then
    echo "-- copying .env from prod checkout"
    cp "$REPO_DIR/web/.env" .env
  else
    echo "-- WARNING: $REPO_DIR/web/.env not found, starting from .env.example"
    echo "-- TODO(operator): fill in ADMIN_USERNAME/ADMIN_PASSWORD/SESSION_SECRET/OPENAI_API_KEY"
    cp .env.example .env
  fi
  # rewrite/append PORT and DEPLOY_ENV so the dev instance is distinct from prod
  if grep -q '^PORT=' .env; then
    sed -i 's/^PORT=.*/PORT=3002/' .env
  else
    echo 'PORT=3002' >> .env
  fi
  if grep -q '^DEPLOY_ENV=' .env; then
    sed -i 's/^DEPLOY_ENV=.*/DEPLOY_ENV=dev/' .env
  else
    echo 'DEPLOY_ENV=dev' >> .env
  fi
fi

echo "-- installing deps in worktree"
pnpm install --frozen-lockfile

echo "-- building worktree (SELF_HOSTED=true)"
SELF_HOSTED=true pnpm build

mkdir -p "$AGENT_DATA_DIR"

# --- pm2 apps ---
cd "$REPO_DIR/web"

if pm2 describe natura-dev >/dev/null 2>&1; then
  echo "-- restarting natura-dev"
  pm2 restart natura-dev --update-env
else
  echo "-- starting natura-dev"
  pm2 start ecosystem.config.cjs --only natura-dev
fi

if pm2 describe natura-agent >/dev/null 2>&1; then
  echo "-- restarting natura-agent (AGENT_PROD_BRANCH=$PROD_BRANCH)"
  AGENT_PROD_BRANCH="$PROD_BRANCH" pm2 restart natura-agent --update-env
else
  echo "-- starting natura-agent (AGENT_PROD_BRANCH=$PROD_BRANCH)"
  AGENT_PROD_BRANCH="$PROD_BRANCH" pm2 start ecosystem.config.cjs --only natura-agent
fi

pm2 save

cat <<EOF

== done ==

If this is the first run, install and issue TLS for the dev vhost (needs sudo,
not run by this script):

  sudo cp $REPO_DIR/web/deploy/nginx/natura-dev.conf /etc/nginx/sites-available/natura-dev
  sudo ln -sf /etc/nginx/sites-available/natura-dev /etc/nginx/sites-enabled/natura-dev
  sudo nginx -t && sudo systemctl reload nginx
  sudo certbot --nginx -d dev.natura.2-25-153-144.sslip.io --redirect

Watch the agent with: pm2 logs natura-agent
EOF
