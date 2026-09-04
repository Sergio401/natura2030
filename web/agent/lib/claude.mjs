// Wrapper around `claude -p` for the change executor. See docs/AGENT_CONTRACT.md
// ("Corrida de Claude (worker)") for the exact flags expected.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

let maxTurnsSupportCache = null;

/**
 * Probe `claude --help` once for a `--max-turns` flag. Cached per process.
 * @param {string} bin
 * @returns {Promise<boolean>}
 */
export async function supportsMaxTurns(bin) {
  if (maxTurnsSupportCache !== null) return maxTurnsSupportCache;
  maxTurnsSupportCache = await new Promise((resolve) => {
    try {
      const child = spawn(bin, ['--help'], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      child.stdout.on('data', (chunk) => {
        out += chunk.toString('utf8');
      });
      child.stderr.on('data', (chunk) => {
        out += chunk.toString('utf8');
      });
      child.on('error', () => resolve(false));
      child.on('close', () => resolve(out.includes('--max-turns')));
    } catch {
      resolve(false);
    }
  });
  return maxTurnsSupportCache;
}

/** Test-only: reset the cached --max-turns probe result. */
export function resetMaxTurnsCache() {
  maxTurnsSupportCache = null;
}

/**
 * Run one `claude -p` round and parse its `--output-format json` result.
 *
 * @param {object} opts
 * @param {string} opts.cwd                Working directory (AGENT_DEV_DIR/web).
 * @param {string} opts.prompt              The `-p` prompt text for this round.
 * @param {string} [opts.resumeSessionId]   Session id to --resume (feedback/autofix rounds).
 * @param {string} opts.settingsPath        Path passed to --settings.
 * @param {string} opts.model               Passed to --model.
 * @param {string} [opts.bin]               Claude binary, default "claude".
 * @param {number} [opts.timeoutMs]         Kill the process after this many ms.
 * @param {string} opts.logFile             Absolute path; raw stdout is written here.
 * @param {string} [opts.appendSystemPrompt] Passed to --append-system-prompt.
 * @param {NodeJS.ProcessEnv} [opts.env]    Defaults to process.env (must inherit HOME).
 * @returns {Promise<{ok: boolean, sessionId: string|null, numTurns: number|null, costUsd: number|null, result: string|null, isError: boolean, raw: string, timedOut: boolean}>}
 */
export async function runClaude(opts) {
  const {
    cwd,
    prompt,
    resumeSessionId,
    settingsPath,
    model,
    bin = 'claude',
    timeoutMs,
    logFile,
    appendSystemPrompt,
    env,
  } = opts;

  const args = [
    '-p', prompt,
    '--output-format', 'json',
    '--model', model,
    '--tools', 'Read,Glob,Grep,Edit,Write',
    '--allowedTools', 'Read,Glob,Grep,Edit,Write',
    '--permission-mode', 'dontAsk',
    '--settings', settingsPath,
  ];

  if (appendSystemPrompt) {
    args.push('--append-system-prompt', appendSystemPrompt);
  }

  if (resumeSessionId) {
    args.push('--resume', resumeSessionId);
  }

  if (await supportsMaxTurns(bin)) {
    args.push('--max-turns', '40');
  }

  const runEnv = env ?? process.env;

  const child = spawn(bin, args, {
    cwd,
    env: runEnv,
    stdio: ['ignore', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let timer = null;

  const { code } = await new Promise((resolve, reject) => {
    child.stdout.on('data', (chunk) => {
      stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk.toString('utf8');
    });

    if (timeoutMs) {
      timer = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');
        setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            // already gone
          }
        }, 5000);
      }, timeoutMs);
    }

    child.on('error', (error) => {
      if (timer) clearTimeout(timer);
      reject(error);
    });

    child.on('close', (exitCode) => {
      if (timer) clearTimeout(timer);
      resolve({ code: exitCode });
    });
  });

  if (logFile) {
    await fs.mkdir(path.dirname(logFile), { recursive: true });
    await fs.writeFile(logFile, stdout || '', 'utf8');
  }

  if (timedOut) {
    return {
      ok: false,
      sessionId: resumeSessionId ?? null,
      numTurns: null,
      costUsd: null,
      result: 'Tiempo de espera agotado esperando a Claude.',
      isError: true,
      raw: stdout,
      timedOut: true,
    };
  }

  let parsed = null;
  try {
    parsed = JSON.parse(stdout);
  } catch {
    parsed = null;
  }

  if (!parsed || typeof parsed !== 'object') {
    return {
      ok: false,
      sessionId: resumeSessionId ?? null,
      numTurns: null,
      costUsd: null,
      result: stderr.trim() || `claude terminó con código ${code} sin salida JSON válida.`,
      isError: true,
      raw: stdout,
      timedOut: false,
    };
  }

  const isError = Boolean(parsed.is_error) || code !== 0;

  return {
    ok: !isError,
    sessionId: typeof parsed.session_id === 'string' ? parsed.session_id : (resumeSessionId ?? null),
    numTurns: typeof parsed.num_turns === 'number' ? parsed.num_turns : null,
    costUsd: typeof parsed.total_cost_usd === 'number' ? parsed.total_cost_usd : null,
    result: typeof parsed.result === 'string' ? parsed.result : null,
    isError,
    raw: stdout,
    timedOut: false,
  };
}
