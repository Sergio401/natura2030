import type { APIRoute } from 'astro';
import { hasValidSession, isSameOrigin } from '../../../../../lib/admin/auth';
import { isValidId, setAction, StoreError } from '../../../../../../agent/lib/store.mjs';
import type { Job } from '../../../../../lib/admin/jobs-types';

export const prerender = false;

const NO_STORE = { 'cache-control': 'no-store' } as const;
const ACTION_TYPES = new Set(['approve', 'discard', 'feedback']);
const FEEDBACK_MAX = 4000;

export const POST: APIRoute = async ({ params, request, cookies }) => {
  if (!isSameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403, headers: NO_STORE });
  if (!(await hasValidSession(cookies))) {
    return Response.json({ error: 'Tu sesión expiró.' }, { status: 401, headers: NO_STORE });
  }

  const id = params.id ?? '';
  if (!isValidId(id)) {
    return Response.json({ error: 'Id de cambio inválido.' }, { status: 400, headers: NO_STORE });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400, headers: NO_STORE });
  }
  const { type, instruction } = (body ?? {}) as { type?: unknown; instruction?: unknown };
  if (typeof type !== 'string' || !ACTION_TYPES.has(type)) {
    return Response.json({ error: 'Acción desconocida.' }, { status: 400, headers: NO_STORE });
  }
  if (type === 'feedback' && (typeof instruction !== 'string' || !instruction.trim() || instruction.length > FEEDBACK_MAX)) {
    return Response.json({ error: `El feedback debe tener entre 1 y ${FEEDBACK_MAX} caracteres.` }, { status: 400, headers: NO_STORE });
  }

  try {
    const job = (await setAction(
      id,
      type === 'feedback' ? { type, instruction: instruction as string } : { type: type as 'approve' | 'discard' },
    )) as Job;
    return Response.json({ job }, { headers: NO_STORE });
  } catch (error) {
    if (error instanceof StoreError) {
      if (error.code === 'NOT_FOUND') {
        return Response.json({ error: error.message }, { status: 404, headers: NO_STORE });
      }
      if (error.code === 'BAD_STATE') {
        return Response.json({ error: error.message, job: error.job as Job | null }, { status: 409, headers: NO_STORE });
      }
      if (error.code === 'INVALID') {
        return Response.json({ error: error.message }, { status: 400, headers: NO_STORE });
      }
    }
    console.error('[admin/jobs/:id/action] failed', error);
    return Response.json({ error: 'No fue posible registrar la acción.' }, { status: 500, headers: NO_STORE });
  }
};
