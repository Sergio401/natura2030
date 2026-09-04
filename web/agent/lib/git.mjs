// Git helpers used by the worker. See docs/AGENT_CONTRACT.md for the exact
// sequence of operations expected in each state transition.
//
// All paths returned by statusPaths() are relative to the git repo root
// (i.e. include the leading `web/` when the repo root is one level above).

import path from 'node:path';
import { run } from './shell.mjs';

const AGENT_AUTHOR_NAME = 'NATURA Agent';
const AGENT_AUTHOR_EMAIL = 'agent@natura2030.local';

/**
 * @param {object} opts
 * @param {string} opts.cwd        Absolute path of the git worktree root (e.g. AGENT_DEV_DIR).
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.logFile]
 * @param {number} [opts.timeoutMs]
 */
function ctx(opts) {
  const { cwd, env, logFile, timeoutMs } = opts;
  return { cwd, env: env ?? process.env, logFile, timeoutMs };
}

/**
 * git(['status', ...], opts)
 */
async function git(args, opts, { throwOnError = true } = {}) {
  return run('git', args, { ...ctx(opts), throwOnError });
}

/**
 * Reset a worktree (already checked out on the dev branch) to origin/<prodBranch>:
 *   git fetch origin
 *   git reset --hard origin/<prodBranch>
 *   git clean -fd          (NOT -fdx: this worktree has its own node_modules/.env, gitignored)
 *
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string} opts.prodBranch
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.logFile]
 */
export async function resetWorktreeToProd({ cwd, prodBranch, env, logFile }) {
  await git(['fetch', 'origin'], { cwd, env, logFile });
  await git(['reset', '--hard', `origin/${prodBranch}`], { cwd, env, logFile });
  await git(['clean', '-fd'], { cwd, env, logFile });
}

/**
 * Parse `git status --porcelain -z --untracked-files=all` output into a flat
 * list of repo-root-relative paths (renames contribute both the old and new path).
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {Promise<string[]>}
 */
export async function statusPaths(cwd, env) {
  const result = await git(['status', '--porcelain', '-z', '--untracked-files=all'], { cwd, env });
  const raw = result.stdout;
  if (!raw) return [];
  // NUL-separated records: "XY <path>" normally; for renames/copies (status
  // starts with R or C) the record is followed by a second NUL-terminated
  // record holding the origin path, with no status prefix of its own.
  const NUL = String.fromCharCode(0);
  const records = raw.split(NUL).filter((entry) => entry.length > 0);
  const paths = [];
  for (let i = 0; i < records.length; i += 1) {
    const record = records[i];
    const statusCode = record.slice(0, 2);
    const filePath = record.slice(3);
    paths.push(filePath);
    if (/^[RC]/.test(statusCode)) {
      i += 1;
      if (records[i]) paths.push(records[i]);
    }
  }
  return paths;
}

/**
 * `git diff --stat` against origin/<prodBranch> (i.e. everything this job changed).
 * @param {string} cwd
 * @param {string} prodBranch
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function diffStat(cwd, prodBranch, env) {
  const result = await git(['diff', '--stat', `origin/${prodBranch}`], { cwd, env }, { throwOnError: false });
  return result.stdout.trim();
}

/**
 * Stage everything and commit with the fixed agent identity, WITHOUT touching
 * the repo's own git config (`-c user.name=... -c user.email=...` flags instead).
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string} opts.summary
 * @param {string} opts.jobId
 * @param {string} opts.instruction
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.logFile]
 * @returns {Promise<string>} the new commit sha
 */
export async function commitAll({ cwd, summary, jobId, instruction, env, logFile }) {
  await git(['add', '-A'], { cwd, env, logFile });
  const message = `[agent] ${summary}\n\nJob: ${jobId}\n\n${instruction}`;
  await git(
    [
      '-c', `user.name=${AGENT_AUTHOR_NAME}`,
      '-c', `user.email=${AGENT_AUTHOR_EMAIL}`,
      'commit', '-m', message,
    ],
    { cwd, env, logFile },
  );
  return revParseHead(cwd, env);
}

/**
 * @param {string} cwd
 * @param {NodeJS.ProcessEnv} [env]
 */
export async function revParseHead(cwd, env) {
  const result = await git(['rev-parse', 'HEAD'], { cwd, env });
  return result.stdout.trim();
}

/**
 * Push a branch. Dev pushes use --force-with-lease (the worker may have reset
 * dev locally on discard/failure); prod pushes are plain fast-forward pushes.
 * Skipped entirely when push=false (AGENT_GIT_PUSH=false).
 * @param {object} opts
 * @param {string} opts.cwd
 * @param {string} opts.branch
 * @param {boolean} [opts.force]
 * @param {boolean} opts.push
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.logFile]
 */
export async function pushBranch({ cwd, branch, force = false, push, env, logFile }) {
  if (!push) return { skipped: true };
  const args = force
    ? ['push', '--force-with-lease', 'origin', branch]
    : ['push', 'origin', branch];
  await git(args, { cwd, env, logFile });
  return { skipped: false };
}

/**
 * Prod-side merge: `git pull --ff-only` then `git merge --ff-only <devBranch>`.
 * The dev worktree belongs to the same repository, so the local `<devBranch>`
 * ref is exactly the worktree's HEAD — no dependency on the push having
 * happened (AGENT_GIT_PUSH=false still works).
 * @param {object} opts
 * @param {string} opts.cwd          AGENT_PROD_DIR (repo root of the prod checkout).
 * @param {string} opts.devBranch
 * @param {NodeJS.ProcessEnv} [opts.env]
 * @param {string} [opts.logFile]
 * @returns {Promise<string>} the new HEAD sha
 */
export async function mergeDevIntoProd({ cwd, devBranch, env, logFile }) {
  await git(['pull', '--ff-only'], { cwd, env, logFile });
  await git(['merge', '--ff-only', devBranch], { cwd, env, logFile });
  return revParseHead(cwd, env);
}

/**
 * Convert a repo-root-relative path to a `web/`-relative path, used to check
 * changed files against the allowlist. Anything outside `web/` returns null
 * (the caller should treat that as a violation).
 * @param {string} repoRelativePath
 * @returns {string|null}
 */
export function toWebRelative(repoRelativePath) {
  const normalised = repoRelativePath.split(path.sep).join('/');
  if (normalised === 'web' || normalised.startsWith('web/')) {
    return normalised === 'web' ? '' : normalised.slice('web/'.length);
  }
  return null;
}
