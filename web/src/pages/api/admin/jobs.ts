import type { APIRoute } from 'astro';
import { adminUsername, hasValidSession, isSameOrigin } from '../../../lib/admin/auth';
import { createJob, listJobs, StoreError } from '../../../../agent/lib/store.mjs';
import type { Job } from '../../../lib/admin/jobs-types';

export const prerender = false;

const NO_STORE = { 'cache-control': 'no-store' } as const;

export const GET: APIRoute = async ({ cookies }) => {
  // No isSameOrigin check here: browsers omit the Origin header on same-origin
  // GET requests, which would otherwise 403 the observer/history polling that
  // the admin UI relies on. The session cookie is sameSite: 'strict', so
  // cross-site requests never carry it anyway. session.ts already follows
  // this pattern.
  if (!(await hasValidSession(cookies))) {
    return Response.json({ error: 'Tu sesión expiró.' }, { status: 401, headers: NO_STORE });
  }
  const jobs = (await listJobs({ limit: 50 })) as Job[];
  return Response.json({ jobs }, { headers: NO_STORE });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403, headers: NO_STORE });
  if (!(await hasValidSession(cookies))) {
    return Response.json({ error: 'Tu sesión expiró.' }, { status: 401, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400, headers: NO_STORE });
  }
  const { summary, instruction } = (body ?? {}) as { summary?: unknown; instruction?: unknown };

  try {
    const job = (await createJob({
      summary: typeof summary === 'string' ? summary : '',
      instruction: typeof instruction === 'string' ? instruction : '',
      requestedBy: adminUsername() || 'admin',
    })) as Job;
    return Response.json({ job }, { status: 201, headers: NO_STORE });
  } catch (error) {
    if (error instanceof StoreError) {
      if (error.code === 'OPEN_JOB') {
        return Response.json({ error: error.message, job: error.job as Job | null }, { status: 409, headers: NO_STORE });
      }
      if (error.code === 'INVALID') {
        return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });
      }
    }
    console.error('[admin/jobs] create failed', error);
    return Response.json({ error: 'No fue posible crear el cambio.' }, { status: 500, headers: NO_STORE });
  }
};
