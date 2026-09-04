import type { APIRoute } from 'astro';
import { createSession, isAdminConfigured, isSameOrigin, verifyCredentials } from '../../../lib/admin/auth';

export const prerender = false;

const attempts = new Map<string, { count: number; resetAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 8;

function clientKey(request: Request): string {
  return request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  if (!isAdminConfigured()) {
    return Response.json({ error: 'El acceso administrativo todavía no está configurado.' }, { status: 503 });
  }

  const key = clientKey(request);
  const now = Date.now();
  const record = attempts.get(key);
  const active = record && record.resetAt > now ? record : { count: 0, resetAt: now + WINDOW_MS };
  if (active.count >= MAX_ATTEMPTS) {
    return Response.json({ error: 'Demasiados intentos. Intenta de nuevo en unos minutos.' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }
  const { username, password } = (body ?? {}) as { username?: unknown; password?: unknown };
  if (typeof username !== 'string' || typeof password !== 'string' || username.length > 120 || password.length > 300) {
    return Response.json({ error: 'Usuario o contraseña inválidos.' }, { status: 400 });
  }

  if (!(await verifyCredentials(username, password))) {
    attempts.set(key, { count: active.count + 1, resetAt: active.resetAt });
    return Response.json({ error: 'Usuario o contraseña incorrectos.' }, { status: 401 });
  }

  attempts.delete(key);
  await createSession(cookies, request.url);
  return Response.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
};

