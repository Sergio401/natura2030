import type { APIRoute } from 'astro';
import { hasValidSession, isSameOrigin } from '../../../lib/admin/auth';
import { ADMIN_SYSTEM_PROMPT } from '../../../lib/admin/policy';

export const prerender = false;

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface Attachment {
  name: string;
  type: string;
  data: string;
  size: number;
}

const MAX_BODY_BYTES = 6 * 1024 * 1024;
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/geo+json',
]);

function validMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length <= 20 && value.every((message) =>
    message &&
    typeof message === 'object' &&
    ((message as ChatMessage).role === 'user' || (message as ChatMessage).role === 'assistant') &&
    typeof (message as ChatMessage).content === 'string' &&
    (message as ChatMessage).content.length <= 8_000,
  );
}

function validAttachments(value: unknown): value is Attachment[] {
  if (!Array.isArray(value) || value.length > 4) return false;
  let total = 0;
  for (const file of value) {
    if (!file || typeof file !== 'object') return false;
    const item = file as Attachment;
    if (
      typeof item.name !== 'string' || item.name.length > 180 ||
      typeof item.type !== 'string' || !ALLOWED_TYPES.has(item.type) ||
      typeof item.data !== 'string' || !item.data.startsWith(`data:${item.type};base64,`) ||
      typeof item.size !== 'number' || item.size <= 0 || item.size > MAX_FILE_BYTES
    ) return false;
    total += item.size;
  }
  return total <= MAX_TOTAL_FILE_BYTES;
}

function extractOutputText(payload: unknown): string {
  const response = payload as { output_text?: unknown; output?: Array<{ content?: Array<{ type?: string; text?: string }> }> };
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isSameOrigin(request)) return Response.json({ error: 'Solicitud no permitida.' }, { status: 403 });
  if (!(await hasValidSession(cookies))) return Response.json({ error: 'Tu sesión expiró.' }, { status: 401 });

  const contentLength = Number(request.headers.get('content-length') ?? 0);
  if (contentLength > MAX_BODY_BYTES) return Response.json({ error: 'Los archivos exceden el límite permitido.' }, { status: 413 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Solicitud inválida.' }, { status: 400 });
  }

  const { messages, attachments = [] } = (body ?? {}) as { messages?: unknown; attachments?: unknown };
  if (!validMessages(messages) || messages.length === 0 || messages.at(-1)?.role !== 'user') {
    return Response.json({ error: 'La conversación no es válida.' }, { status: 400 });
  }
  if (!validAttachments(attachments)) {
    return Response.json({ error: 'Uno de los archivos no está permitido o supera el límite.' }, { status: 400 });
  }

  const apiKey = (import.meta.env.OPENAI_API_KEY ?? process.env.OPENAI_API_KEY)?.trim();
  if (!apiKey) return Response.json({ error: 'La API key del asistente todavía no está configurada.' }, { status: 503 });

  const input = messages.slice(-12).map((message, index, visibleMessages) => {
    const isLatest = index === visibleMessages.length - 1;
    if (!isLatest) return { role: message.role, content: message.content };
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: message.content }];
    for (const file of attachments) {
      if (file.type.startsWith('image/')) {
        content.push({ type: 'input_image', image_url: file.data, detail: 'auto' });
      } else {
        content.push({ type: 'input_file', filename: file.name, file_data: file.data });
      }
    }
    return { role: message.role, content };
  });

  try {
    const response = await fetch('https://api.openai.com/v1/responses', {
      method: 'POST',
      headers: { authorization: `Bearer ${apiKey}`, 'content-type': 'application/json' },
      body: JSON.stringify({
        model: (import.meta.env.OPENAI_MODEL ?? process.env.OPENAI_MODEL)?.trim() || 'gpt-5.4-mini',
        instructions: ADMIN_SYSTEM_PROMPT,
        input,
        store: false,
        max_output_tokens: 1800,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[admin/chat] OpenAI error', response.status, detail.slice(0, 800));
      return Response.json({ error: 'El asistente no pudo procesar la solicitud.' }, { status: 502 });
    }
    const payload = await response.json();
    const message = extractOutputText(payload);
    if (!message) return Response.json({ error: 'El asistente devolvió una respuesta vacía.' }, { status: 502 });
    return Response.json({ message, mode: 'proposal' }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[admin/chat] Request failed', error);
    return Response.json({ error: 'El asistente tardó demasiado o no está disponible.' }, { status: 504 });
  }
};
