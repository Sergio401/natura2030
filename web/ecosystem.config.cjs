// PM2 process definition for the NATURA 2030 site on the VPS.
//   pm2 start ecosystem.config.cjs
//   pm2 restart natura
//
// Notes:
// - node/pnpm/pm2 live in ~/.local/share/pnpm/bin on this box; `interpreter`
//   is pinned to an absolute path so pm2 works even when resurrected at boot
//   with a bare PATH.
// - `pnpm build` (with SELF_HOSTED=true) emits a standalone Astro Node server
//   at dist/server/entry.mjs — no dev deps needed at runtime.
// - Environment (ADMIN_USERNAME, ADMIN_PASSWORD, SESSION_SECRET,
//   OPENAI_API_KEY, OPENAI_MODEL, HOST, PORT) is read from
//   ~/code/natura2030/web/.env by Astro at startup.

const { homedir } = require('node:os');
const path = require('node:path');

module.exports = {
  apps: [
    {
      name: 'natura',
      cwd: path.join(homedir(), 'code', 'natura2030', 'web'),
      script: 'dist/server/entry.mjs',
      interpreter: path.join(homedir(), '.local', 'share', 'pnpm', 'bin', 'node'),
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
  ],
};
