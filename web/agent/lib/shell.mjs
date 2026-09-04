// Small process-spawning helper shared by git.mjs, claude.mjs and worker.mjs.
// No shell is ever used: every call passes an args array to child_process.spawn.

import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';

export class ShellError extends Error {
  /**
   * @param {string} message
   * @param {{code: number|null, stdout: string, stderr: string, signal?: string|null}} details
   */
  constructor(message, details) {
    super(message);
    this.name = 'ShellError';
    this.code = details.code;
    this.stdout = details.stdout;
    this.stderr = details.stderr;
    this.signal = details.signal ?? null;
  }
}

/**
 * Run a command with an args array. Never throws on a non-zero exit unless
 * `throwOnError` is true; the caller decides how to handle failure otherwise.
 *
 * @param {string} cmd
 * @param {string[]} args
 * @param {object} [options]
 * @param {string} [options.cwd]
 * @param {NodeJS.ProcessEnv} [options.env]
 * @param {string} [options.logFile]   Absolute path; if given, stdout+stderr are appended to it.
 * @param {number} [options.timeoutMs] Kill the process if it runs longer than this.
 * @param {boolean} [options.throwOnError] Throw a ShellError on non-zero exit / timeout.
 * @param {string} [options.input]     Optional stdin to write and close.
 * @returns {Promise<{code: number|null, stdout: string, stderr: string, signal: string|null, timedOut: boolean}>}
 */
export async function run(cmd, args, options = {}) {
  const { cwd, env, logFile, timeoutMs, throwOnError = false, input } = options;

  const child = spawn(cmd, args, {
    cwd,
    env: env ?? process.env,
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  let stdout = '';
  let stderr = '';
  let timedOut = false;
  let timer = null;

  const result = await new Promise((resolve, reject) => {
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
        // Give it a moment, then force-kill if still alive.
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

    child.on('close', (code, signal) => {
      if (timer) clearTimeout(timer);
      resolve({ code, stdout, stderr, signal, timedOut });
    });

    if (input != null) {
      child.stdin.write(input);
    }
    child.stdin.end();
  });

  if (logFile) {
    await appendLog(logFile, `$ ${cmd} ${args.join(' ')}\n${result.stdout}${result.stderr}\n`);
  }

  if (throwOnError && (result.code !== 0 || result.timedOut)) {
    const reason = result.timedOut ? 'tiempo de espera agotado' : `código de salida ${result.code}`;
    throw new ShellError(`Falló "${cmd} ${args.join(' ')}" (${reason})`, result);
  }

  return result;
}

/**
 * Append text to a log file, creating parent directories as needed.
 * @param {string} logFile
 * @param {string} text
 */
export async function appendLog(logFile, text) {
  await fs.mkdir(path.dirname(logFile), { recursive: true });
  await fs.appendFile(logFile, text, 'utf8');
}

/**
 * Tail the last N lines of a string.
 * @param {string} text
 * @param {number} [n]
 */
export function tailLines(text, n = 40) {
  const lines = text.split('\n');
  return lines.slice(Math.max(0, lines.length - n)).join('\n');
}
