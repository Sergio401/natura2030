#!/usr/bin/env node
// pm2 entry point for the change executor (app "natura-agent", cwd = web/).
// All logic lives in agent/lib/machine.mjs; this file only starts the loop.
// It runs main() unconditionally — do not import it from tests, import
// agent/lib/machine.mjs instead.

import { main } from './lib/machine.mjs';

main().catch((error) => {
  console.error(`[${new Date().toISOString()}] [worker] Error fatal: ${error?.stack || error?.message || error}`);
  process.exit(1);
});
