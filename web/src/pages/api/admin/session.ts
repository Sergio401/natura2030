import type { APIRoute } from 'astro';
import { hasValidSession, isAdminConfigured } from '../../../lib/admin/auth';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  return Response.json(
    { authenticated: await hasValidSession(cookies), configured: isAdminConfigured(), mode: 'proposal' },
    { headers: { 'cache-control': 'no-store' } },
  );
};

