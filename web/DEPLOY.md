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
# OPENAI_API_KEY, OPENAI_MODEL, plus HOST=127.0.0.1 and PORT=3001

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
- The server binds `127.0.0.1` only (`HOST` in `.env` / `ecosystem.config.cjs`);
  nginx is the only public entry point.
- `/admin` (the private chat) needs `OPENAI_API_KEY` set — until then it just
  reports itself as unconfigured, the rest of the site works normally.
