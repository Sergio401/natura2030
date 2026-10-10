// Single source of truth for which files the change executor may touch.
// Paths are relative to the `web/` directory of the dev worktree.
// Applied twice: in the Claude PreToolUse hook (agent/hooks/allowlist-guard.mjs)
// and by the worker over `git status --porcelain` after every Claude round.
//
// A path is allowed when it matches ALLOWED_PATTERNS and does not match
// DENIED_PATTERNS (the deny list always wins). New files are allowed inside the
// allowed areas — that is how map points, landing images and new models land.

import path from 'node:path';

/**
 * Editable areas, by capability:
 * - landing text, styles and panels: src/data, the v1 theme, shared components;
 * - images: src/assets (uploads are copied into src/assets/uploads by the worker);
 * - map points and map styles: src/data/platform-*, src/features/platform;
 * - Python models: src/features/models and their routes under src/pages/models.
 */
export const ALLOWED_PATTERNS = Object.freeze([
  'src/data/**',
  'src/themes/v1-nature-distilled/**',
  'src/components/shared/**',
  'src/assets/**',
  'src/features/platform/**',
  'src/features/models/**',
  'src/pages/models/**',
]);

/**
 * Never editable, even inside an allowed area: dependencies, build/deploy
 * config, the admin itself, the executor, secrets.
 */
export const DENIED_PATTERNS = Object.freeze([
  '**/package.json',
  '**/pnpm-lock.yaml',
  '**/pnpm-workspace.yaml',
  '**/astro.config.*',
  '**/tsconfig*.json',
  '**/.env*',
  '**/*.sh',
  'agent/**',
  'deploy/**',
  'ecosystem.config.cjs',
  'src/pages/api/**',
  'src/pages/admin/**',
  'src/lib/admin/**',
  'src/features/admin/**',
  'src/layouts/**',
]);

// Back-compat name: prompts and docs list these as "allowed paths".
export const ALLOWED_FILES = ALLOWED_PATTERNS;

function globToRegExp(glob) {
  let source = '';
  for (let i = 0; i < glob.length; i += 1) {
    const char = glob[i];
    if (char === '*') {
      if (glob[i + 1] === '*') {
        // `**/` matches zero or more directories; a trailing `**` matches anything.
        if (glob[i + 2] === '/') {
          source += '(?:.*/)?';
          i += 2;
        } else {
          source += '.*';
          i += 1;
        }
      } else {
        source += '[^/]*';
      }
    } else if ('\\^$+?.()|{}[]'.includes(char)) {
      source += `\\${char}`;
    } else {
      source += char;
    }
  }
  return new RegExp(`^${source}$`);
}

const allowed = ALLOWED_PATTERNS.map(globToRegExp);
const denied = DENIED_PATTERNS.map(globToRegExp);

/**
 * Normalise a path (absolute or relative) to a `web/`-relative POSIX path.
 * @param {string} filePath  Absolute path, or path relative to `webDir`.
 * @param {string} webDir    Absolute path of the `web/` directory of the worktree.
 * @returns {string} POSIX-style relative path (may start with `../` if outside webDir).
 */
export function toWebRelative(filePath, webDir) {
  const absolute = path.isAbsolute(filePath) ? filePath : path.resolve(webDir, filePath);
  return path.relative(webDir, absolute).split(path.sep).join('/');
}

/**
 * @param {string} filePath  Absolute path, or path relative to `webDir`.
 * @param {string} webDir    Absolute path of the `web/` directory of the worktree.
 */
export function isAllowed(filePath, webDir) {
  const relative = toWebRelative(filePath, webDir);
  if (!relative || relative.startsWith('../') || relative === '..') return false;
  if (relative.split('/').some((segment) => segment === '..' || segment === '.git')) return false;
  if (denied.some((pattern) => pattern.test(relative))) return false;
  return allowed.some((pattern) => pattern.test(relative));
}
