// PM2 process definitions for the NATURA 2030 site on the VPS.
//   pm2 start ecosystem.config.cjs                 # all apps
//   pm2 start ecosystem.config.cjs --only natura   # just one
//   pm2 restart natura
//
// Notes:
// - node/pnpm/pm2 live in ~/.local/share/pnpm/bin on this box; `interpreter`
//   is pinned to an absolute path so pm2 works even when resurrected at boot
//   with a bare PATH. The `claude` CLI lives in ~/.local/bin.
// - `pnpm build` (with SELF_HOSTED=true) emits a standalone Astro Node server
//   at dist/server/entry.mjs — no dev deps needed at runtime.
// - `natura` (prod, port 3001) reads ADMIN_USERNAME, ADMIN_PASSWORD,
//   SESSION_SECRET, OPENAI_API_KEY, OPENAI_MODEL, HOST, PORT from
//   ~/code/natura2030/web/.env at startup.
// - `natura-dev` (port 3002) is the same app running from the `dev` branch
//   worktree at ~/code/natura2030-dev/web, with its own .env (PORT=3002,
//   DEPLOY_ENV=dev so BaseLayout shows the red "not published yet" banner).
// - `natura-agent` runs the change-request worker (agent/worker.mjs) that
//   watches ~/natura-agent/jobs, drives Claude in the dev worktree, verifies,
//   and promotes dev → prod. See docs/AGENT_CONTRACT.md for the full
//   contract and docs/ADMIN_AGENT.md for the operator-facing summary.
//   AGENT_PROD_BRANCH defaults to 'main' but must be 'chatbot' until the
//   chatbot branch is merged into main — start (or restart) with:
//     AGENT_PROD_BRANCH=chatbot pm2 start ecosystem.config.cjs --only natura-agent
//   pm2 remembers the env from the last `pm2 start`/`restart --update-env`,
//   so once you switch it you don't need to repeat the prefix on every
//   `pm2 restart natura-agent` — only when you actually want to change it.

const { homedir } = require('node:os');
const path = require('node:path');

const home = homedir();
const pnpmBin = path.join(home, '.local', 'share', 'pnpm', 'bin');
const localBin = path.join(home, '.local', 'bin');
const agentPath = [pnpmBin, localBin, process.env.PATH || '/usr/bin:/bin'].join(':');

module.exports = {
  apps: [
    {
      name: 'natura',
      cwd: path.join(home, 'code', 'natura2030', 'web'),
      script: 'dist/server/entry.mjs',
      interpreter: path.join(pnpmBin, 'node'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3001',
      },
    },
    {
      name: 'natura-dev',
      cwd: path.join(home, 'code', 'natura2030-dev', 'web'),
      script: 'dist/server/entry.mjs',
      interpreter: path.join(pnpmBin, 'node'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '400M',
      env: {
        NODE_ENV: 'production',
        HOST: '127.0.0.1',
        PORT: '3002',
        DEPLOY_ENV: 'dev',
      },
    },
    {
      name: 'natura-agent',
      cwd: path.join(home, 'code', 'natura2030', 'web'),
      script: 'agent/worker.mjs',
      interpreter: path.join(pnpmBin, 'node'),
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_restarts: 10,
      max_memory_restart: '250M',
      env: {
        NODE_ENV: 'production',
        PATH: agentPath,
        AGENT_DATA_DIR: path.join(home, 'natura-agent'),
        AGENT_PROD_DIR: path.join(home, 'code', 'natura2030'),
        AGENT_DEV_DIR: path.join(home, 'code', 'natura2030-dev'),
        // Read at pm2-start time so `AGENT_PROD_BRANCH=chatbot pm2 start
        // ecosystem.config.cjs --only natura-agent` overrides the default
        // below without editing this file. See header comment.
        AGENT_PROD_BRANCH: process.env.AGENT_PROD_BRANCH || 'main',
        AGENT_DEV_BRANCH: process.env.AGENT_DEV_BRANCH || 'dev',
        AGENT_DEV_URL: process.env.AGENT_DEV_URL || 'https://dev.natura.2-25-153-144.sslip.io',
        AGENT_CLAUDE_MODEL: process.env.AGENT_CLAUDE_MODEL || 'sonnet',
      },
    },
  ],
};
