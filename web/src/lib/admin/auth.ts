import type { AstroCookies } from 'astro';

const COOKIE_NAME = 'natura_admin_session';
const SESSION_SECONDS = 8 * 60 * 60;
const encoder = new TextEncoder();

function env(name: string): string {
  const astroEnv: Record<string, string | undefined> = {
    ADMIN_USERNAME: import.meta.env.ADMIN_USERNAME,
    ADMIN_PASSWORD: import.meta.env.ADMIN_PASSWORD,
    SESSION_SECRET: import.meta.env.SESSION_SECRET,
  };
  return (astroEnv[name] ?? process.env[name])?.trim() ?? '';
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', encoder.encode(value)));
}

async function safeEqual(left: string, right: string): Promise<boolean> {
  const [a, b] = await Promise.all([digest(left), digest(right)]);
  let difference = 0;
  for (let index = 0; index < a.length; index += 1) difference |= a[index] ^ b[index];
  return difference === 0;
}

async function sign(payload: string): Promise<string> {
  const secret = env('SESSION_SECRET');
  if (secret.length < 32) throw new Error('SESSION_SECRET must contain at least 32 characters');
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(payload));
  return toBase64Url(new Uint8Array(signature));
}

export function isAdminConfigured(): boolean {
  return Boolean(env('ADMIN_USERNAME') && env('ADMIN_PASSWORD') && env('SESSION_SECRET').length >= 32);
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const [validUser, validPassword] = await Promise.all([
    safeEqual(username, env('ADMIN_USERNAME')),
    safeEqual(password, env('ADMIN_PASSWORD')),
  ]);
  return validUser && validPassword;
}

export async function createSession(cookies: AstroCookies, requestUrl: string): Promise<void> {
  const expires = Math.floor(Date.now() / 1000) + SESSION_SECONDS;
  const payload = `${env('ADMIN_USERNAME')}.${expires}`;
  const token = `${payload}.${await sign(payload)}`;
  cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: new URL(requestUrl).protocol === 'https:',
    path: '/',
    maxAge: SESSION_SECONDS,
  });
}

export function clearSession(cookies: AstroCookies): void {
  cookies.delete(COOKIE_NAME, { path: '/' });
}

export async function hasValidSession(cookies: AstroCookies): Promise<boolean> {
  if (!isAdminConfigured()) return false;
  const token = cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  const [username, expiresRaw, providedSignature] = parts;
  const expires = Number(expiresRaw);
  if (!Number.isInteger(expires) || expires <= Date.now() / 1000) return false;
  if (!(await safeEqual(username, env('ADMIN_USERNAME')))) return false;
  const expectedSignature = await sign(`${username}.${expiresRaw}`);
  return safeEqual(providedSignature, expectedSignature);
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin');
  return Boolean(origin && origin === new URL(request.url).origin);
}
