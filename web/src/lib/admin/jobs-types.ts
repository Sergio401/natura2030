// Mirrors the Job schema from docs/AGENT_CONTRACT.md and agent/lib/store.mjs.
// store.mjs is plain JS with JSDoc typedefs that are not exported by name, so
// API routes cast the store's return values to these types at the boundary
// instead of importing the (unexported) `Job` typedef.

export type JobStatus =
  | 'queued'
  | 'running'
  | 'verifying'
  | 'deploying_dev'
  | 'preview'
  | 'deploying_prod'
  | 'done'
  | 'failed'
  | 'discarded';

export type ActionType = 'approve' | 'discard' | 'feedback';

export interface JobRound {
  n: number;
  kind: 'initial' | 'feedback' | 'autofix';
  startedAt: string;
  finishedAt: string | null;
  instruction: string;
  sessionId: string | null;
  numTurns: number | null;
  costUsd: number | null;
  result: string | null;
  ok: boolean | null;
}

export interface JobAction {
  type: ActionType;
  at: string;
  instruction?: string;
}

export interface JobLogEntry {
  at: string;
  status: JobStatus;
  message: string;
}

export interface JobDevInfo {
  commit: string;
  url: string;
  deployedAt: string;
}

export interface JobProdInfo {
  commit: string;
  deployedAt: string;
}

export interface Job {
  id: string;
  createdAt: string;
  updatedAt: string;
  status: JobStatus;
  summary: string;
  instruction: string;
  requestedBy: string;
  rounds: JobRound[];
  action: JobAction | null;
  changedFiles: string[];
  diffStat: string | null;
  dev: JobDevInfo | null;
  prod: JobProdInfo | null;
  error: string | null;
  log: JobLogEntry[];
}
