import type { APIRoute } from 'astro';
import { hasValidSession } from '../../../../lib/admin/auth';
import { getJob, isValidId } from '../../../../../agent/lib/store.mjs';
import type { Job } from '../../../../lib/admin/jobs-types';

export const prerender = false;

const NO_STORE = { 'cache-control': 'no-store' } as const;

// No isSameOrigin check: this is a GET route polled by the admin UI's
// observer, and browsers omit Origin on same-origin GETs. See jobs.ts.
export const GET: APIRoute = async ({ params, cookies }) => {
  if (!(await hasValidSession(cookies))) {
    return Response.json({ error: 'Tu sesión expiró.' }, { status: 401, headers: NO_STORE });
  }
  const id = params.id ?? '';
  if (!isValidId(id)) {
    return Response.json({ error: 'Id de cambio inválido.' }, { status: 400, headers: NO_STORE });
  }
  const job = (await getJob(id)) as Job | null;
  if (!job) {
    return Response.json({ error: 'Cambio no encontrado.' }, { status: 404, headers: NO_STORE });
  }
  return Response.json({ job }, { headers: NO_STORE });
};
