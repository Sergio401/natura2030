// Job store shared by the Astro API routes (src/pages/api/admin/jobs*) and the
// worker (agent/worker.mjs). One JSON file per job under `${AGENT_DATA_DIR}/jobs`.
// Schema and state machine: docs/AGENT_CONTRACT.md.

import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomBytes } from 'node:crypto';

/** @typedef {'queued'|'running'|'verifying'|'deploying_dev'|'preview'|'deploying_prod'|'done'|'failed'|'discarded'} JobStatus */
/** @typedef {'approve'|'discard'|'feedback'} ActionType */

/**
 * @typedef {object} JobRound
 * @property {number} n
 * @property {'initial'|'feedback'|'autofix'} kind
 * @property {string} startedAt
 * @property {string|null} finishedAt
 * @property {string} instruction
 * @property {string|null} sessionId
 * @property {number|null} numTurns
 * @property {number|null} costUsd
 * @property {string|null} result
 * @property {boolean|null} ok
 */

/**
 * @typedef {object} JobAction
 * @property {ActionType} type
 * @property {string} at
 * @property {string} [instruction]
 */

/**
 * @typedef {object} JobLogEntry
 * @property {string} at
 * @property {JobStatus} status
 * @property {string} message
 */

/**
 * @typedef {object} Job
 * @property {string} id
 * @property {string} createdAt
 * @property {string} updatedAt
 * @property {JobStatus} status
 * @property {string} summary
 * @property {string} instruction
 * @property {string} requestedBy
 * @property {JobRound[]} rounds
 * @property {JobAction|null} action
 * @property {string[]} changedFiles
 * @property {string|null} diffStat
 * @property {{commit: string, url: string, deployedAt: string}|null} dev
 * @property {{commit: string, deployedAt: string}|null} prod
 * @property {string|null} error
 * @property {JobLogEntry[]} log
 * @property {JobAttachment[]} [attachments]
 */

/**
 * A file the admin uploaded in the chat and that travels with the job. Stored
 * under `${AGENT_DATA_DIR}/attachments/<job id>/<file>`; the worker copies it
 * into the dev worktree before each Claude round.
 * @typedef {object} JobAttachment
 * @property {string} name   Original file name, as the admin saw it.
 * @property {string} file   Sanitised file name on disk (unique within the job).
 * @property {string} type   MIME type.
 * @property {number} size   Bytes.
 */

export const TERMINAL = Object.freeze(['done', 'failed', 'discarded']);
export const ACTION_TYPES = Object.freeze(['approve', 'discard', 'feedback']);

export const LIMITS = Object.freeze({
  summary: 140,
  instruction: 12000,
  feedback: 4000,
  result: 4000,
});

// Shared with src/pages/api/admin/chat.ts and the admin UI: what can be
// uploaded in the chat and handed to the executor.
export const ATTACHMENT_TYPES = Object.freeze({
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'application/pdf': 'pdf',
  'text/plain': 'txt',
  'text/markdown': 'md',
  'text/csv': 'csv',
  'text/tab-separated-values': 'tsv',
  'text/yaml': 'yaml',
  'text/x-python': 'py',
  'application/json': 'json',
  'application/geo+json': 'geojson',
});

export const ATTACHMENT_LIMITS = Object.freeze({
  count: 6,
  fileBytes: 3 * 1024 * 1024,
  // base64 inflates ~4/3; nginx caps request bodies at 8 MB (deploy/nginx/natura.conf).
  totalBytes: 5 * 1024 * 1024,
});

export class StoreError extends Error {
  /**
   * @param {'OPEN_JOB'|'NOT_FOUND'|'BAD_STATE'|'INVALID'} code
   * @param {string} message
   * @param {Job|null} [job]
   */
  constructor(code, message, job = null) {
    super(message);
    this.name = 'StoreError';
    this.code = code;
    this.job = job;
  }
}

export function dataDir() {
  return process.env.AGENT_DATA_DIR?.trim() || path.join(os.homedir(), 'natura-agent');
}

export function jobsDir() {
  return path.join(dataDir(), 'jobs');
}

export function attachmentsDir(id) {
  return path.join(dataDir(), 'attachments', id);
}

export function logsDir(id) {
  return path.join(dataDir(), 'logs', id);
}

/** @param {JobStatus} status */
export function isTerminal(status) {
  return TERMINAL.includes(status);
}

function now() {
  return new Date().toISOString();
}

function newId() {
  const stamp = now().replace(/[-:]/g, '').replace(/\..*$/, '').replace('T', '-');
  return `${stamp}-${randomBytes(2).toString('hex')}`;
}

const ID_PATTERN = /^\d{8}-\d{6}-[0-9a-f]{4}$/;

/** @param {string} id */
export function isValidId(id) {
  return typeof id === 'string' && ID_PATTERN.test(id);
}

function jobPath(id) {
  if (!isValidId(id)) throw new StoreError('INVALID', `Job id inválido: ${id}`);
  return path.join(jobsDir(), `${id}.json`);
}

async function ensureDirs() {
  await fs.mkdir(jobsDir(), { recursive: true });
}

/** @param {Job} job */
async function writeJob(job) {
  await ensureDirs();
  const target = jobPath(job.id);
  const tmp = `${target}.tmp`;
  await fs.writeFile(tmp, JSON.stringify(job, null, 2) + '\n', 'utf8');
  await fs.rename(tmp, target);
}

/**
 * @param {string} id
 * @returns {Promise<Job|null>}
 */
export async function getJob(id) {
  if (!isValidId(id)) return null;
  try {
    const raw = await fs.readFile(jobPath(id), 'utf8');
    return /** @type {Job} */ (JSON.parse(raw));
  } catch (error) {
    if (/** @type {NodeJS.ErrnoException} */ (error).code === 'ENOENT') return null;
    throw error;
  }
}

/**
 * Newest first. Reads every job file; fine for the volumes this admin handles.
 * @param {{limit?: number}} [options]
 * @returns {Promise<Job[]>}
 */
export async function listJobs({ limit = 50 } = {}) {
  await ensureDirs();
  const names = (await fs.readdir(jobsDir()))
    .filter((name) => name.endsWith('.json'))
    .map((name) => name.slice(0, -'.json'.length))
    .filter(isValidId)
    .sort()
    .reverse()
    .slice(0, Math.max(0, limit));
  const jobs = await Promise.all(names.map((id) => getJob(id)));
  return jobs.filter((job) => job !== null);
}

/** @returns {Promise<Job|null>} */
export async function findOpenJob() {
  const jobs = await listJobs({ limit: 1000 });
  return jobs.find((job) => !isTerminal(job.status)) ?? null;
}

/**
 * Append a timeline entry and bump updatedAt. Mutates and returns the job.
 * @param {Job} job
 * @param {JobStatus} status
 * @param {string} message
 */
export function appendLog(job, status, message) {
  const at = now();
  job.status = status;
  job.updatedAt = at;
  job.log.push({ at, status, message });
  return job;
}

function sanitiseFileName(name, ext, taken) {
  const base = String(name)
    .replace(/\.[^.]*$/, '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'archivo';
  let candidate = `${base}.${ext}`;
  for (let n = 2; taken.has(candidate); n += 1) candidate = `${base}-${n}.${ext}`;
  taken.add(candidate);
  return candidate;
}

/**
 * Validate uploaded files ({name, type, data: data-URL}) and decode them.
 * @param {unknown} value
 * @returns {Array<{name: string, type: string, ext: string, bytes: Buffer}>}
 */
export function decodeAttachments(value) {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.length > ATTACHMENT_LIMITS.count) {
    throw new StoreError('INVALID', `Se pueden adjuntar hasta ${ATTACHMENT_LIMITS.count} archivos por cambio.`);
  }
  let total = 0;
  return value.map((item) => {
    const { name, type, data } = /** @type {{name?: unknown, type?: unknown, data?: unknown}} */ (item ?? {});
    const ext = typeof type === 'string' ? ATTACHMENT_TYPES[/** @type {keyof typeof ATTACHMENT_TYPES} */ (type)] : undefined;
    const prefix = `data:${type};base64,`;
    if (typeof name !== 'string' || !name || name.length > 180 || !ext || typeof data !== 'string' || !data.startsWith(prefix)) {
      throw new StoreError('INVALID', 'Uno de los archivos adjuntos no está permitido.');
    }
    const bytes = Buffer.from(data.slice(prefix.length), 'base64');
    total += bytes.length;
    if (bytes.length === 0 || bytes.length > ATTACHMENT_LIMITS.fileBytes || total > ATTACHMENT_LIMITS.totalBytes) {
      throw new StoreError('INVALID', 'Uno de los archivos adjuntos supera el tamaño permitido.');
    }
    return { name, type: /** @type {string} */ (type), ext, bytes };
  });
}

/**
 * Web side: create a queued job. Throws StoreError('OPEN_JOB') if another job is open.
 * @param {{summary: string, instruction: string, requestedBy: string, attachments?: unknown}} input
 * @returns {Promise<Job>}
 */
export async function createJob({ summary, instruction, requestedBy, attachments: rawAttachments }) {
  if (typeof summary !== 'string' || !summary.trim() || summary.length > LIMITS.summary) {
    throw new StoreError('INVALID', `El resumen debe tener entre 1 y ${LIMITS.summary} caracteres.`);
  }
  if (typeof instruction !== 'string' || !instruction.trim() || instruction.length > LIMITS.instruction) {
    throw new StoreError('INVALID', `La instrucción debe tener entre 1 y ${LIMITS.instruction} caracteres.`);
  }
  const files = decodeAttachments(rawAttachments);
  const open = await findOpenJob();
  if (open) throw new StoreError('OPEN_JOB', `Ya hay un cambio abierto (${open.id}).`, open);

  const at = now();
  const id = newId();
  /** @type {JobAttachment[]} */
  const attachments = [];
  if (files.length > 0) {
    const dir = attachmentsDir(id);
    await fs.mkdir(dir, { recursive: true });
    const taken = new Set();
    for (const file of files) {
      const fileName = sanitiseFileName(file.name, file.ext, taken);
      await fs.writeFile(path.join(dir, fileName), file.bytes);
      attachments.push({ name: file.name, file: fileName, type: file.type, size: file.bytes.length });
    }
  }
  /** @type {Job} */
  const job = {
    id,
    createdAt: at,
    updatedAt: at,
    status: 'queued',
    summary: summary.trim(),
    instruction: instruction.trim(),
    requestedBy: String(requestedBy || 'admin'),
    rounds: [],
    action: null,
    changedFiles: [],
    diffStat: null,
    dev: null,
    prod: null,
    error: null,
    log: [{ at, status: 'queued', message: 'Solicitud recibida.' }],
    attachments,
  };
  await writeJob(job);
  return job;
}

/**
 * Web side: record a pending action on a job in `preview`.
 * @param {string} id
 * @param {{type: ActionType, instruction?: string}} action
 * @returns {Promise<Job>}
 */
export async function setAction(id, action) {
  if (!ACTION_TYPES.includes(action?.type)) throw new StoreError('INVALID', 'Acción desconocida.');
  if (action.type === 'feedback') {
    const text = action.instruction;
    if (typeof text !== 'string' || !text.trim() || text.length > LIMITS.feedback) {
      throw new StoreError('INVALID', `El feedback debe tener entre 1 y ${LIMITS.feedback} caracteres.`);
    }
  }
  return updateJob(id, (job) => {
    if (job.status !== 'preview') throw new StoreError('BAD_STATE', `El cambio está en estado "${job.status}", no acepta acciones.`, job);
    if (job.action) throw new StoreError('BAD_STATE', 'Ya hay una acción pendiente para este cambio.', job);
    /** @type {JobAction} */
    const pending = { type: action.type, at: now() };
    if (action.type === 'feedback') pending.instruction = /** @type {string} */ (action.instruction).trim();
    job.action = pending;
    job.updatedAt = pending.at;
    const labels = { approve: 'Publicación en producción solicitada.', discard: 'Descarte solicitado.', feedback: 'Ajustes solicitados.' };
    job.log.push({ at: pending.at, status: job.status, message: labels[action.type] });
    return job;
  });
}

/**
 * Atomic read-modify-write. The mutator may edit the job in place or return a new one.
 * Single-process assumption per writer role (web writes only on create/setAction,
 * worker writes everything else); no cross-process locking beyond atomic rename.
 * @param {string} id
 * @param {(job: Job) => Job|void} mutator
 * @returns {Promise<Job>}
 */
export async function updateJob(id, mutator) {
  const current = await getJob(id);
  if (!current) throw new StoreError('NOT_FOUND', `No existe el cambio ${id}.`);
  const next = mutator(current) ?? current;
  next.updatedAt = now();
  await writeJob(next);
  return next;
}
