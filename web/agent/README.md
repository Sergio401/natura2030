# `agent/` — change executor worker

Drives the admin change pipeline described in `../docs/AGENT_CONTRACT.md`: takes a queued job
written by the `/admin` chat, runs `claude -p` in the `dev` worktree to make the edit, verifies
it (`pnpm check` + `pnpm build`), commits and deploys to a dev preview, then — once approved in
the admin UI — merges dev into prod and deploys there.

## Files

- `worker.mjs` — the long-running process (pm2 app `natura-agent`). Polls for the single open
  job every `AGENT_POLL_INTERVAL_MS` (default 3 s) and drives it through the state machine.
  Exports `processOnce(config)`, `resolveConfig()`, `generateSettings(config)`, `acquireLock`,
  `releaseLock` for reuse/testing; running the file directly (`node agent/worker.mjs`) starts
  the poll loop.
- `lib/claude.mjs` — spawns `claude -p` with the exact flags from the contract, parses the
  `--output-format json` result, kills on timeout.
- `lib/prompt.mjs` — builds the four prompts (`rules`, `initial`, `feedback`, `autofix`), all in
  Spanish, all reminding the model it has no shell.
- `lib/git.mjs` — git plumbing: reset a worktree to `origin/<prodBranch>`, parse
  `git status --porcelain -z` into a path list, commit with the fixed agent identity, push,
  `git merge --ff-only` for the prod side.
- `lib/shell.mjs` — generic `spawn` wrapper (`run()`) used by git/pnpm/pm2 calls; no shell is
  ever invoked, everything is an args array.
- `lib/store.mjs`, `lib/allowlist.mjs` — shared with the web side, not owned by this deliverable
  (see their own headers).
- `hooks/allowlist-guard.mjs` — the Claude Code `PreToolUse` hook. Standalone script; reads the
  hook event JSON from stdin and exits 2 (blocking) with a Spanish reason on stderr for any
  Edit/Write/MultiEdit outside the allowlist.

## Env vars

All optional; defaults match `docs/AGENT_CONTRACT.md`'s table.

| Var | Default |
|---|---|
| `AGENT_DATA_DIR` | `~/natura-agent` |
| `AGENT_PROD_DIR` | `~/code/natura2030` |
| `AGENT_DEV_DIR` | `~/code/natura2030-dev` |
| `AGENT_PROD_BRANCH` | `main` |
| `AGENT_DEV_BRANCH` | `dev` |
| `AGENT_DEV_URL` | `https://dev.natura.2-25-153-144.sslip.io` |
| `AGENT_PM2_PROD` / `AGENT_PM2_DEV` | `natura` / `natura-dev` |
| `AGENT_CLAUDE_BIN` | `claude` |
| `AGENT_CLAUDE_MODEL` | `sonnet` |
| `AGENT_CLAUDE_TIMEOUT_MS` | `900000` |
| `AGENT_MAX_FIX_ROUNDS` | `1` |
| `AGENT_GIT_PUSH` | `true` |
| `AGENT_PNPM_BIN` | `pnpm` |
| `AGENT_PM2_BIN` | `pm2` |
| `AGENT_POLL_INTERVAL_MS` | `3000` |

## Running locally

```sh
node agent/worker.mjs
```

On start it prepends `~/.local/share/pnpm/bin` and `~/.local/bin` to `PATH` (where node/pnpm/
pm2/claude live on the VPS), acquires `${AGENT_DATA_DIR}/worker.lock`, writes
`${AGENT_DATA_DIR}/claude-settings.json` with the `PreToolUse` hook wired in, then polls.

**Note on the hook path:** `claude-settings.json` points at an absolute path resolved from where
`worker.mjs` itself lives — i.e. `${AGENT_PROD_DIR}/web/agent/hooks/allowlist-guard.mjs`, since
pm2 always runs the worker from the prod checkout even while Claude's own `cwd` is the *dev*
worktree. That's intentional (the hook script itself isn't something the allowlist lets Claude
edit or move), it just looks surprising at first glance.

## How the test works

`test/smoke.test.mjs` (`node --test agent/test/smoke.test.mjs`) builds a throwaway git "origin"
(bare repo), a prod clone and a `dev` worktree under the OS scratch dir — never the real repo —
seeded with a minimal `web/src/data/content.es.ts`. It stubs three binaries with small `.mjs`
scripts:

- `AGENT_CLAUDE_BIN` — one variant edits the allowlisted file and prints a fake
  `--output-format json` success result (also answers `--help` with a line containing
  `--max-turns`, since the worker probes for that flag before the first invocation); a second
  variant creates a file outside the allowlist instead, to exercise the post-run
  `git status`-based allowlist check (the `PreToolUse` hook itself never runs against a stub —
  it's verified separately, see below).
- `AGENT_PNPM_BIN` / `AGENT_PM2_BIN` — log their args to a file and exit 0.

It then calls `processOnce(config)` directly (no lock, no poll loop — those are gated behind
`if (import.meta.url === pathToFileURL(process.argv[1]).href)` in `worker.mjs`) and asserts:

1. a queued job reaches `preview` with a dev commit in one pass, then `approve` reaches `done`
   with a prod commit equal to the dev commit (the worktree is a real `git worktree add` off the
   prod clone, so `git merge --ff-only` can resolve `dev` locally, exactly like on the VPS);
2. a fresh job whose fake Claude creates a forbidden file ends `failed` with the dev worktree
   clean (`git status --porcelain` empty);
3. `discard` ends `discarded` with the dev worktree reset back to `origin/main`.

`AGENT_GIT_PUSH` is left `true` against the real (throwaway) bare origin, so pushes are exercised
for real, not skipped.

To verify the hook standalone (not part of the automated test, since the test never spawns real
Claude):

```sh
echo '{"cwd":"/some/web","tool_input":{"file_path":"src/data/content.es.ts"}}' | node agent/hooks/allowlist-guard.mjs; echo $?   # 0
echo '{"cwd":"/some/web","tool_input":{"file_path":"src/pages/index.astro"}}' | node agent/hooks/allowlist-guard.mjs; echo $?    # 2
```

### Running the test

```sh
node --test agent/test/smoke.test.mjs
```

`node --test agent/test/` (bare directory, trailing slash) does **not** work on this machine's
Node 23.3.0 — it errors with `MODULE_NOT_FOUND` even for a trivial test file in an unrelated
throwaway project, so it isn't a bug in this test. `node --test agent/test/*.mjs` (shell-expanded
glob) and the explicit file path both work; use whichever the runtime on hand supports.
