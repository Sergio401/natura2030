import type { APIRoute } from 'astro';
import { clearSession, isSameOrigin } from '../../../lib/admin/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  clearSession(cookies);
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};

