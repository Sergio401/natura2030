// Change executor state machine. Drives the single open job (see store.mjs)
// through the states documented in docs/AGENT_CONTRACT.md. Claude never runs
// shell commands; verification, git and pm2 are all driven here,
// deterministically.
//
// This module has no side effects on import: agent/worker.mjs is the pm2
// entry point that calls `main()`, and agent/test/smoke.test.mjs calls
// `processOnce()` directly. (Keeping the entry point separate matters: under
// pm2 fork mode `process.argv[1]` is pm2's own container script, so an
// `import.meta.url === argv[1]` guard silently never runs main.)

import os from 'node:os';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import { fileURLToPath } from 'node:url';

import {
  findOpenJob,
  updateJob,
  appendLog,
  isTerminal,
  logsDir,
  LIMITS,
} from './store.mjs';
import { ALLOWED_FILES, isAllowed } from './allowlist.mjs';
import {
  resetWorktreeToProd,
  statusPaths,
  diffStat,
  commitAll,
  pushBranch,
  mergeDevIntoProd,
  toWebRelative as gitToWebRelative,
} from './git.mjs';
import { run, tailLines, ShellError } from './shell.mjs';
import { runClaude } from './claude.mjs';
import {
  buildRulesPrompt,
  buildInitialPrompt,
  buildFeedbackPrompt,
  buildAutofixPrompt,
} from './prompt.mjs';

const IN_FLIGHT_STATES = ['running', 'verifying', 'deploying_dev', 'deploying_prod'];

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

function numEnv(name, def) {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return def;
  const n = Number(v);
  return Number.isFinite(n) ? n : def;
}

function boolEnv(name, def) {
  const v = process.env[name];
  if (v === undefined || v.trim() === '') return def;
  const s = v.trim().toLowerCase();
  if (s === 'false' || s === '0' || s === 'no') return false;
  if (s === 'true' || s === '1' || s === 'yes') return true;
  return def;
}

/**
 * Resolve worker configuration from AGENT_* env vars, applying the defaults
 * from docs/AGENT_CONTRACT.md's "Directorios y ramas" table. `settingsPath`
 * is NOT resolved here (it depends on where the worker file lives); callers
 * set it via generateSettings() before the first processOnce() call.
 */
export function resolveConfig() {
  const home = os.homedir();
  return {
    dataDir: process.env.AGENT_DATA_DIR?.trim() || path.join(home, 'natura-agent'),
    prodDir: process.env.AGENT_PROD_DIR?.trim() || path.join(home, 'code', 'natura2030'),
    devDir: process.env.AGENT_DEV_DIR?.trim() || path.join(home, 'code', 'natura2030-dev'),
    prodBranch: process.env.AGENT_PROD_BRANCH?.trim() || 'main',
    devBranch: process.env.AGENT_DEV_BRANCH?.trim() || 'dev',
    devUrl: process.env.AGENT_DEV_URL?.trim() || 'https://dev.natura.2-25-153-144.sslip.io',
    pm2Prod: process.env.AGENT_PM2_PROD?.trim() || 'natura',
    pm2Dev: process.env.AGENT_PM2_DEV?.trim() || 'natura-dev',
    claudeBin: process.env.AGENT_CLAUDE_BIN?.trim() || 'claude',
    claudeModel: process.env.AGENT_CLAUDE_MODEL?.trim() || 'sonnet',
    claudeTimeoutMs: numEnv('AGENT_CLAUDE_TIMEOUT_MS', 900000),
    maxFixRounds: numEnv('AGENT_MAX_FIX_ROUNDS', 1),
    gitPush: boolEnv('AGENT_GIT_PUSH', true),
    pnpmBin: process.env.AGENT_PNPM_BIN?.trim() || 'pnpm',
    pm2Bin: process.env.AGENT_PM2_BIN?.trim() || 'pm2',
    pollIntervalMs: numEnv('AGENT_POLL_INTERVAL_MS', 3000),
    settingsPath: null,
  };
}

function devWebDir(config) {
  return path.join(config.devDir, 'web');
}

function prodWebDir(config) {
  return path.join(config.prodDir, 'web');
}

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

function log(jobId, message) {
  console.log(`[${new Date().toISOString()}] [${jobId ?? '-'}] ${message}`);
}

function truncate(text, max) {
  if (typeof text !== 'string') return text ?? null;
  if (text.length <= max) return text;
  return `${text.slice(0, max)}…`;
}

/** Turn a caught error (ShellError or plain Error) into a short Spanish-log-friendly tail. */
function shellErrorTail(error) {
  if (error instanceof ShellError) {
    const combined = `${error.stdout || ''}${error.stderr || ''}`;
    return tailLines(combined, 40) || error.message;
  }
  return error?.message || String(error);
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Claude settings.json + PreToolUse hook wiring
// ---------------------------------------------------------------------------

function hookCommandPath() {
  const here = path.dirname(fileURLToPath(import.meta.url)); // agent/lib
  return path.join(here, '..', 'hooks', 'allowlist-guard.mjs');
}

/**
 * Generate `${dataDir}/claude-settings.json` with the PreToolUse hook.
 * Idempotent: safe to call on every worker start, always overwrites.
 * @param {ReturnType<typeof resolveConfig>} config
 * @returns {Promise<string>} the settings file path
 */
export async function generateSettings(config) {
  const settingsPath = path.join(config.dataDir, 'claude-settings.json');
  const hookPath = hookCommandPath();
  const settings = {
    hooks: {
      PreToolUse: [
        {
          matcher: 'Edit|Write|MultiEdit',
          hooks: [{ type: 'command', command: `node ${hookPath}` }],
        },
      ],
    },
  };
  await fs.mkdir(config.dataDir, { recursive: true });
  await fs.writeFile(settingsPath, `${JSON.stringify(settings, null, 2)}\n`, 'utf8');
  return settingsPath;
}

// ---------------------------------------------------------------------------
// Worker lock
// ---------------------------------------------------------------------------

function lockFilePath(config) {
  return path.join(config.dataDir, 'worker.lock');
}

function isPidAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    if (error && error.code === 'ESRCH') return false;
    if (error && error.code === 'EPERM') return true; // exists, owned by someone else
    return false;
  }
}

/**
 * Acquire the worker lock, refusing to start if another live pid holds it.
 * A lock file pointing at a dead pid is treated as stale and overwritten.
 * @param {ReturnType<typeof resolveConfig>} config
 */
export async function acquireLock(config) {
  const file = lockFilePath(config);
  await fs.mkdir(config.dataDir, { recursive: true });

  let existingPid = null;
  try {
    const raw = await fs.readFile(file, 'utf8');
    const parsed = Number(raw.trim());
    if (Number.isInteger(parsed) && parsed > 0) existingPid = parsed;
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }

  if (existingPid && isPidAlive(existingPid)) {
    throw new Error(`Ya hay un worker corriendo (pid ${existingPid}, lock en ${file}).`);
  }

  await fs.writeFile(file, String(process.pid), 'utf8');
}

/**
 * Release the lock, only if it still points at this process's pid.
 * @param {ReturnType<typeof resolveConfig>} config
 */
export async function releaseLock(config) {
  const file = lockFilePath(config);
  try {
    const raw = await fs.readFile(file, 'utf8');
    if (Number(raw.trim()) === process.pid) {
      await fs.unlink(file);
    }
  } catch {
    // best effort; nothing to release if the file is already gone
  }
}

// ---------------------------------------------------------------------------
// State transitions
// ---------------------------------------------------------------------------

/**
 * Leave the job failed, with the dev worktree reset to origin/<prodBranch>
 * so the next job starts clean. Clears any pending action.
 */
async function failJob(job, config, message) {
  try {
    await resetWorktreeToProd({ cwd: config.devDir, prodBranch: config.prodBranch, env: process.env });
  } catch (error) {
    log(job.id, `No se pudo limpiar el worktree de desarrollo tras el fallo: ${shellErrorTail(error)}`);
  }
  const shortMessage = truncate(message, 4000);
  return updateJob(job.id, (j) => {
    j.error = shortMessage;
    j.action = null;
    return appendLog(j, 'failed', truncate(message, 500));
  });
}

/**
 * Run one `claude -p` round (initial/feedback/autofix), record it on the job,
 * and move the job to `verifying` on success or `failed` on failure.
 */
async function runClaudeRound(job, config, { kind, prompt, resumeSessionId }) {
  const roundN = job.rounds.length + 1;
  const startedAt = new Date().toISOString();
  const logFile = path.join(logsDir(job.id), `claude-${roundN}.json`);
  const rules = buildRulesPrompt(ALLOWED_FILES);

  let result;
  try {
    result = await runClaude({
      cwd: devWebDir(config),
      prompt,
      resumeSessionId,
      settingsPath: config.settingsPath,
      model: config.claudeModel,
      bin: config.claudeBin,
      timeoutMs: config.claudeTimeoutMs,
      logFile,
      appendSystemPrompt: rules,
      env: process.env,
    });
  } catch (error) {
    result = {
      ok: false,
      sessionId: resumeSessionId ?? null,
      numTurns: null,
      costUsd: null,
      result: error.message,
      isError: true,
      raw: '',
      timedOut: false,
    };
  }

  const round = {
    n: roundN,
    kind,
    startedAt,
    finishedAt: new Date().toISOString(),
    instruction: prompt,
    sessionId: result.sessionId,
    numTurns: result.numTurns,
    costUsd: result.costUsd,
    result: truncate(result.result, LIMITS.result),
    ok: result.ok,
  };

  job = await updateJob(job.id, (j) => {
    j.rounds.push(round);
    return j;
  });

  if (!result.ok) {
    const tail = truncate(result.result || 'Claude terminó con error sin mensaje.', 2000);
    return failJob(job, config, `Claude no pudo completar el cambio (ronda ${roundN}, ${kind}): ${tail}`);
  }

  return updateJob(job.id, (j) => appendLog(j, 'verifying', 'pnpm check y build en curso.'));
}

/** queued -> running (reset worktree, run initial Claude round) -> verifying|failed */
async function handleQueued(job, config) {
  try {
    await resetWorktreeToProd({ cwd: config.devDir, prodBranch: config.prodBranch, env: process.env });
  } catch (error) {
    return failJob(job, config, `No se pudo preparar el entorno de desarrollo: ${shellErrorTail(error)}`);
  }

  job = await updateJob(job.id, (j) => appendLog(j, 'running', 'Claude está editando (ronda 1).'));

  return runClaudeRound(job, config, { kind: 'initial', prompt: buildInitialPrompt(job) });
}

/** verifying: allowlist -> pnpm install -> pnpm check -> pnpm build -> deploying_dev | running(autofix) | failed */
async function handleVerifying(job, config) {
  const webDir = devWebDir(config);

  const changed = await statusPaths(config.devDir, process.env);
  const violations = [];
  const changedFiles = [];
  for (const repoRelative of changed) {
    const webRelative = gitToWebRelative(repoRelative);
    if (webRelative === null || !isAllowed(webRelative, webDir)) {
      violations.push(repoRelative);
      continue;
    }
    changedFiles.push(webRelative);
  }

  if (violations.length > 0) {
    return failJob(job, config, `Claude modificó archivos fuera de lo permitido: ${violations.join(', ')}.`);
  }

  job = await updateJob(job.id, (j) => {
    j.changedFiles = changedFiles;
    return j;
  });

  // Deps first: the worktree was just reset to origin/<prod>, whose lockfile
  // may have moved since the last job. Cheap when nothing changed.
  const installLog = path.join(logsDir(job.id), 'install.log');
  const installResult = await run(config.pnpmBin, ['install', '--frozen-lockfile'], {
    cwd: webDir,
    env: process.env,
    logFile: installLog,
  });
  if (installResult.code !== 0) {
    return failJob(job, config, `pnpm install falló en el entorno de desarrollo:\n${tailLines(`${installResult.stdout || ''}${installResult.stderr || ''}`, 40)}`);
  }

  const checkLog = path.join(logsDir(job.id), 'check.log');
  const checkResult = await run(config.pnpmBin, ['check'], { cwd: webDir, env: process.env, logFile: checkLog });
  if (checkResult.code !== 0) {
    return handleVerifyFailure(job, config, 'pnpm check', checkResult);
  }

  const buildLog = path.join(logsDir(job.id), 'build.log');
  const buildResult = await run(config.pnpmBin, ['build'], {
    cwd: webDir,
    env: { ...process.env, SELF_HOSTED: 'true' },
    logFile: buildLog,
  });
  if (buildResult.code !== 0) {
    return handleVerifyFailure(job, config, 'pnpm build', buildResult);
  }

  return updateJob(job.id, (j) => appendLog(j, 'deploying_dev', 'Publicando en el entorno de desarrollo.'));
}

/** A check/build failure: spend an autofix round if any remain, else fail. */
async function handleVerifyFailure(job, config, stepName, result) {
  const tail = tailLines(`${result.stdout || ''}${result.stderr || ''}`, 40);
  const roundsUsed = job.rounds.filter((r) => r.kind === 'autofix').length;

  if (roundsUsed < config.maxFixRounds) {
    job = await updateJob(job.id, (j) =>
      appendLog(j, 'running', `${stepName} falló; Claude intenta corregirlo (ronda de autofix).`),
    );
    const lastSessionId = job.rounds[job.rounds.length - 1]?.sessionId;
    return runClaudeRound(job, config, {
      kind: 'autofix',
      prompt: buildAutofixPrompt(job, tail),
      resumeSessionId: lastSessionId,
    });
  }

  return failJob(job, config, `${stepName} falló y no quedan rondas de autofix disponibles:\n${tail}`);
}

/** pm2 restart natura-dev, falling back to starting it from the prod ecosystem file. */
async function restartPm2Dev(config, logFile) {
  const restart = await run(config.pm2Bin, ['restart', config.pm2Dev, '--update-env'], {
    env: process.env,
    logFile,
  });
  if (restart.code === 0) return;

  const ecosystemPath = path.join(prodWebDir(config), 'ecosystem.config.cjs');
  const start = await run(config.pm2Bin, ['start', ecosystemPath, '--only', config.pm2Dev], {
    cwd: prodWebDir(config),
    env: process.env,
    logFile,
  });
  if (start.code !== 0) {
    throw new Error(tailLines(`${start.stdout || ''}${start.stderr || ''}`, 40) || 'pm2 start falló.');
  }
}

/**
 * deploying_dev: commit + push dev, then pm2 restart of the dev app (the
 * build from `verifying` is already in place) -> preview | failed.
 */
async function handleDeployingDev(job, config) {
  const deployLog = path.join(logsDir(job.id), 'deploy.log');

  let commitSha;
  try {
    commitSha = await commitAll({
      cwd: config.devDir,
      summary: job.summary,
      jobId: job.id,
      instruction: job.instruction,
      env: process.env,
      logFile: deployLog,
    });
    await pushBranch({
      cwd: config.devDir,
      branch: config.devBranch,
      force: true,
      push: config.gitPush,
      env: process.env,
      logFile: deployLog,
    });
  } catch (error) {
    return failJob(job, config, `No se pudo confirmar/publicar el cambio en desarrollo: ${shellErrorTail(error)}`);
  }

  const stat = await diffStat(config.devDir, config.prodBranch, process.env);
  job = await updateJob(job.id, (j) => {
    j.diffStat = stat;
    return j;
  });

  // dist/ was already produced by the build in `verifying`, on exactly the
  // tree that was just committed; restarting pm2 is enough.
  try {
    await restartPm2Dev(config, deployLog);
  } catch (error) {
    return failJob(
      job,
      config,
      `El commit de desarrollo se hizo (${commitSha.slice(0, 7)}) pero el despliegue a desarrollo falló: ${shellErrorTail(error)}`,
    );
  }

  return updateJob(job.id, (j) => {
    j.dev = { commit: commitSha, url: config.devUrl, deployedAt: new Date().toISOString() };
    return appendLog(j, 'preview', `Vista previa lista en ${config.devUrl}.`);
  });
}

/** preview: consume job.action (approve|discard|feedback), or stay idle if none. */
async function handlePreviewAction(job, config) {
  const action = job.action;
  if (!action) return job; // idle; the caller stops the loop here

  if (action.type === 'discard') {
    const deployLog = path.join(logsDir(job.id), 'deploy.log');
    try {
      await resetWorktreeToProd({ cwd: config.devDir, prodBranch: config.prodBranch, env: process.env });
      await pushBranch({
        cwd: config.devDir,
        branch: config.devBranch,
        force: true,
        push: config.gitPush,
        env: process.env,
      });
      // dist/ still holds the discarded change; rebuild so the dev site shows
      // the same content as prod again before restarting.
      const build = await run(config.pnpmBin, ['build'], {
        cwd: devWebDir(config),
        env: { ...process.env, SELF_HOSTED: 'true' },
        logFile: deployLog,
      });
      if (build.code !== 0) {
        throw new Error(tailLines(`${build.stdout || ''}${build.stderr || ''}`, 40) || 'pnpm build falló.');
      }
      await restartPm2Dev(config, deployLog);
    } catch (error) {
      return failJob(job, config, `No se pudo descartar el cambio limpiamente: ${shellErrorTail(error)}`);
    }
    return updateJob(job.id, (j) => {
      j.action = null;
      return appendLog(j, 'discarded', 'Cambio descartado; entorno de desarrollo restablecido.');
    });
  }

  if (action.type === 'approve') {
    return updateJob(job.id, (j) => {
      j.action = null;
      return appendLog(j, 'deploying_prod', 'Publicando en producción.');
    });
  }

  if (action.type === 'feedback') {
    const feedbackText = action.instruction;
    job = await updateJob(job.id, (j) => {
      j.action = null;
      return appendLog(j, 'running', 'Aplicando los ajustes pedidos.');
    });
    const lastSessionId = job.rounds[job.rounds.length - 1]?.sessionId;
    return runClaudeRound(job, config, {
      kind: 'feedback',
      prompt: buildFeedbackPrompt(job, feedbackText),
      resumeSessionId: lastSessionId,
    });
  }

  // Unknown action type: leave untouched rather than silently dropping it.
  return job;
}

/**
 * deploying_prod: `git pull --ff-only` + `git merge --ff-only dev` + push,
 * then pnpm install + build + pm2 restart + pm2 save in the prod checkout
 * -> done | failed.
 */
async function handleDeployingProd(job, config) {
  const webDir = prodWebDir(config);
  const deployLog = path.join(logsDir(job.id), 'deploy.log');

  let commitSha;
  try {
    commitSha = await mergeDevIntoProd({
      cwd: config.prodDir,
      devBranch: config.devBranch,
      env: process.env,
      logFile: deployLog,
    });
    await pushBranch({
      cwd: config.prodDir,
      branch: config.prodBranch,
      force: false,
      push: config.gitPush,
      env: process.env,
      logFile: deployLog,
    });
  } catch (error) {
    return failJob(job, config, `No se pudo fusionar y publicar en producción: ${shellErrorTail(error)}`);
  }

  try {
    const install = await run(config.pnpmBin, ['install', '--frozen-lockfile'], {
      cwd: webDir,
      env: process.env,
      logFile: deployLog,
    });
    if (install.code !== 0) {
      throw new Error(tailLines(`${install.stdout || ''}${install.stderr || ''}`, 40) || 'pnpm install falló.');
    }

    const build = await run(config.pnpmBin, ['build'], {
      cwd: webDir,
      env: { ...process.env, SELF_HOSTED: 'true' },
      logFile: deployLog,
    });
    if (build.code !== 0) {
      throw new Error(tailLines(`${build.stdout || ''}${build.stderr || ''}`, 40) || 'pnpm build falló.');
    }

    const restart = await run(config.pm2Bin, ['restart', config.pm2Prod, '--update-env'], {
      cwd: webDir,
      env: process.env,
      logFile: deployLog,
    });
    if (restart.code !== 0) {
      throw new Error(tailLines(`${restart.stdout || ''}${restart.stderr || ''}`, 40) || 'pm2 restart falló.');
    }

    const save = await run(config.pm2Bin, ['save'], { env: process.env, logFile: deployLog });
    if (save.code !== 0) {
      throw new Error(tailLines(`${save.stdout || ''}${save.stderr || ''}`, 40) || 'pm2 save falló.');
    }
  } catch (error) {
    return failJob(
      job,
      config,
      `Se publicó el commit ${commitSha.slice(0, 7)} en producción pero el despliegue falló: ${shellErrorTail(error)}`,
    );
  }

  return updateJob(job.id, (j) => {
    j.prod = { commit: commitSha, deployedAt: new Date().toISOString() };
    return appendLog(j, 'done', `Publicado en producción (${commitSha.slice(0, 7)}).`);
  });
}

async function advance(job, config) {
  switch (job.status) {
    case 'queued':
      return handleQueued(job, config);
    case 'verifying':
      return handleVerifying(job, config);
    case 'deploying_dev':
      return handleDeployingDev(job, config);
    case 'preview':
      return handlePreviewAction(job, config);
    case 'deploying_prod':
      return handleDeployingProd(job, config);
    default:
      return job;
  }
}

// ---------------------------------------------------------------------------
// Poll loop
// ---------------------------------------------------------------------------

/**
 * Pick the open job (if any) and drive it as far as the state machine allows
 * in one pass: through `queued` (or a pending `preview` action) all the way
 * to `preview` (idle, waiting for the next action) or a terminal state.
 *
 * A job found in an in-flight state (`running`, `verifying`, `deploying_dev`,
 * `deploying_prod`) when picked up means the worker was restarted mid-job —
 * there is no safe way to resume a half-driven Claude session or a half-run
 * deploy, so it is failed and the dev worktree is cleaned for the next job.
 *
 * @param {ReturnType<typeof resolveConfig>} config  Must have `settingsPath` set.
 * @returns {Promise<import('./store.mjs').Job|null>} the job after this pass, or null if none was open.
 */
export async function processOnce(config) {
  process.env.AGENT_DATA_DIR = config.dataDir;

  let job = await findOpenJob();
  if (!job) return null;

  // A job parked in `preview` with nothing to do is the normal idle state
  // while the admin decides; don't log it on every poll.
  if (job.status === 'preview' && !job.action) return job;

  if (IN_FLIGHT_STATES.includes(job.status)) {
    log(job.id, `Encontrado en estado "${job.status}" al arrancar; el worker se reinició a mitad de un cambio.`);
    return failJob(
      job,
      config,
      'El worker se reinició mientras este cambio estaba en curso; no se puede continuar de forma segura.',
    );
  }

  log(job.id, `Retomado en estado "${job.status}".`);

  let iterations = 0;
  while (iterations < 50) {
    iterations += 1;
    const before = job.status;
    job = await advance(job, config);
    log(job.id, `${before} -> ${job.status}`);
    if (isTerminal(job.status)) break;
    // `preview` is always a resting state from this loop's point of view: a
    // recognised action (approve/discard/feedback) moves the status away from
    // `preview` inside handlePreviewAction, so if it's still `preview` here —
    // whether because action was null or an action type advance() didn't
    // recognise — there is nothing left to drive this pass. Stop on status
    // alone rather than diffing `job.action` against its prior value, which
    // only worked by object-reference equality.
    if (job.status === 'preview') break;
  }

  return job;
}

// ---------------------------------------------------------------------------
// Main loop
// ---------------------------------------------------------------------------

/** pm2 entry: lock, settings, poll loop until SIGTERM/SIGINT. */
export async function main() {
  const home = os.homedir();
  const extraPaths = [path.join(home, '.local', 'share', 'pnpm', 'bin'), path.join(home, '.local', 'bin')];
  process.env.PATH = [...extraPaths, process.env.PATH || ''].filter(Boolean).join(path.delimiter);

  const config = resolveConfig();
  process.env.AGENT_DATA_DIR = config.dataDir;

  await acquireLock(config);
  config.settingsPath = await generateSettings(config);

  log('worker', `Worker iniciado. dataDir=${config.dataDir} prodDir=${config.prodDir} devDir=${config.devDir}`);

  let stopping = false;
  const requestStop = (signal) => {
    if (stopping) return;
    stopping = true;
    log('worker', `Señal ${signal} recibida; se termina después del ciclo actual.`);
  };
  process.on('SIGTERM', () => requestStop('SIGTERM'));
  process.on('SIGINT', () => requestStop('SIGINT'));

  while (!stopping) {
    try {
      await processOnce(config);
    } catch (error) {
      log('worker', `Error inesperado en el ciclo: ${error?.stack || error?.message || error}`);
    }
    if (stopping) break;
    await sleep(config.pollIntervalMs);
  }

  await releaseLock(config);
  log('worker', 'Worker detenido.');
  process.exit(0);
}
