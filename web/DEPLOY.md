# Deploy — VPS (self-hosted)

Production still deploys to Vercel from `main` as before. This is a parallel deploy
of the `chatbot` branch to `sergio@2.25.153.144`, running behind nginx + pm2,
mirroring the Zeta setup on the same box.

## First-time setup

```sh
ssh sergio@2.25.153.144
cd ~/code/natura2030 && git fetch && git checkout chatbot && git pull
cd web
export PATH="$HOME/.local/share/pnpm/bin:$PATH"
pnpm install --frozen-lockfile

cp .env.example .env
# edit .env: ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET (32+ chars),
# ANTHROPIC_API_KEY, ANTHROPIC_MODEL, plus HOST=127.0.0.1 and PORT=3001

SELF_HOSTED=true pnpm build
pm2 start ecosystem.config.cjs
pm2 save

sudo cp deploy/nginx/natura.conf /etc/nginx/sites-available/natura
sudo ln -sf /etc/nginx/sites-available/natura /etc/nginx/sites-enabled/natura
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d natura.2-25-153-144.sslip.io --redirect
```

## Updates

```sh
~/code/natura2030/web/deploy/update.sh
```

Pulls `chatbot`, reinstalls, rebuilds with `SELF_HOSTED=true` (standalone Astro
Node adapter instead of the Vercel one), and restarts the pm2 process.

## Notes

- `SELF_HOSTED=true` picks the `@astrojs/node` standalone adapter in
  `astro.config.mjs`; without it, `pnpm build` still targets Vercel — the
  Vercel deploy from `main` is unaffected by any of this.
- `.env` values are baked into `dist/` at build time (Astro `import.meta.env`), so
  after changing `.env` rebuild (`deploy/update.sh` does) — a restart alone keeps the old values.
- The server binds `127.0.0.1` only (`HOST` in `.env` / `ecosystem.config.cjs`);
  nginx is the only public entry point.
- `/admin` (the private chat) needs `ANTHROPIC_API_KEY` set — until then it just
  reports itself as unconfigured, the rest of the site works normally.

## Dev preview + change-request agent

`/admin/` can propose content/structure changes that a worker applies to a
`dev` branch preview and, after a second confirmation, promotes to prod. The
full state machine, job schema, and allowlist live in
[`docs/AGENT_CONTRACT.md`](./docs/AGENT_CONTRACT.md) — read that first if
you're touching `agent/`. This section is only the ops side.

### One-time setup

From `~/code/natura2030/web/deploy` on the VPS, as `sergio`:

```sh
./setup-dev.sh
# or, while `chatbot` is still the effective prod branch:
PROD_BRANCH=chatbot ./setup-dev.sh
```

This creates the `dev` branch and a `git worktree` at
`~/code/natura2030-dev`, copies `.env` into it (rewriting `PORT=3002` and
adding `DEPLOY_ENV=dev`), builds it, and starts the `natura-dev` and
`natura-agent` pm2 apps (see `ecosystem.config.cjs`). It does not touch
nginx or run anything with sudo — it prints the commands to run yourself at
the end:

```sh
sudo cp ~/code/natura2030/web/deploy/nginx/natura-dev.conf /etc/nginx/sites-available/natura-dev
sudo ln -sf /etc/nginx/sites-available/natura-dev /etc/nginx/sites-enabled/natura-dev
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d dev.natura.2-25-153-144.sslip.io --redirect
```

The script is idempotent — safe to re-run after a `git pull` on
`~/code/natura2030` to pick up agent code or config changes.

### How the worker authenticates to Claude

`natura-agent` runs `claude -p ...` as the same `sergio` OS user that is
already logged in interactively with the owner's Claude subscription — no
extra credentials needed. If the worker ever has to run as a *different*
user (or a subscription-less service account), generate a long-lived token
instead of an interactive login:

```sh
claude setup-token
```

and export the result as `CLAUDE_CODE_OAUTH_TOKEN` in that user's
environment (or in `ecosystem.config.cjs`'s `natura-agent` env block).

### Where jobs and logs live

Everything the worker reads and writes is under `AGENT_DATA_DIR`
(`~/natura-agent` by default):

```
~/natura-agent/
  jobs/<id>.json        # one file per change request, full state
  logs/<id>/claude-*.json
  logs/<id>/check.log
  logs/<id>/build.log
  logs/<id>/deploy.log
  worker.lock            # prevents two workers running at once
```

Watch it live with:

```sh
pm2 logs natura-agent
```

### Switching `AGENT_PROD_BRANCH` from `chatbot` to `main`

Once `chatbot` is merged into `main`, stop treating `chatbot` as prod:

```sh
AGENT_PROD_BRANCH=main pm2 restart natura-agent --update-env
pm2 save
```

Do this only when there is no open (non-terminal) job — check
`~/natura-agent/jobs/*.json` or the `/admin/` history table first. New jobs
after the switch will branch `dev` from `origin/main` and merge back into
`main`.

### Manual recovery

- **Reset `dev` back to prod**, discarding whatever is on it:
  ```sh
  cd ~/code/natura2030-dev
  git fetch origin
  git reset --hard origin/<prod-branch>   # main, or chatbot during the transition
  git clean -fd
  git push --force-with-lease origin dev
  pm2 restart natura-dev --update-env
  ```
- **Delete a stuck job** so a new one can start (jobs are single-open-at-a-time):
  ```sh
  rm ~/natura-agent/jobs/<id>.json
  ```
  Leave the corresponding `logs/<id>/` directory for the audit trail unless
  you're intentionally purging it.
- **Clear a stale worker lock** (e.g. after a crash that didn't release it):
  ```sh
  pm2 stop natura-agent
  rm ~/natura-agent/worker.lock
  pm2 start natura-agent
  ```
