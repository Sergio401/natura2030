// Single source of truth for which files the change executor may touch.
// Paths are relative to the `web/` directory of the dev worktree.
// Applied twice: in the Claude PreToolUse hook (agent/hooks/allowlist-guard.mjs)
// and by the worker over `git status --porcelain` after every Claude round.

import path from 'node:path';

export const ALLOWED_FILES = Object.freeze([
  'src/data/content.es.ts',
  'src/data/content.en.ts',
  'src/data/platform-copy.ts',
  'src/data/models-copy.ts',
  'src/themes/v1-nature-distilled/copy.ts',
  'src/themes/v1-nature-distilled/tokens.css',
  'src/themes/v1-nature-distilled/Page.astro',
]);

const allowed = new Set(ALLOWED_FILES);

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
  if (relative.startsWith('../') || relative === '..') return false;
  return allowed.has(relative);
}
