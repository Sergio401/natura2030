import type { APIRoute } from 'astro';
import Anthropic from '@anthropic-ai/sdk';
import { hasValidSession, isSameOrigin } from '../../../lib/admin/auth';
import { ADMIN_SYSTEM_PROMPT } from '../../../lib/admin/policy';
import { findOpenJob, LIMITS } from '../../../../agent/lib/store.mjs';

export const prerender = false;

// The chat ("processing" block) talks to the Claude API with a server-side
// API key. This is independent from the executor: agent/worker.mjs drives
// `claude -p` with the operator's claude.ai login and deliberately strips
// ANTHROPIC_API_KEY from that process's environment.
const DEFAULT_MODEL = 'claude-opus-5';

const SUBMIT_CHANGE_TOOL: Anthropic.Tool = {
  name: 'submit_change_request',
  description: 'Enviar una solicitud de cambio de texto o estructura de la landing al ejecutor, una vez entendida y validada con el usuario.',
  strict: true,
  input_schema: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Una línea para el historial, máximo 140 caracteres.' },
      instruction: { type: 'string', description: 'Instrucción completa y autocontenida para el agente de código: qué archivos tocar, qué texto cambiar, en qué idioma(s), y qué no tocar.' },
    },
    required: ['summary', 'instruction'],
    additionalProperties: false,
  },
};

const DEFAULT_PROPOSAL_MESSAGE = 'Preparé una propuesta de cambio. Revísala y confírmala para ejecutarla.';

const STATUS_LABELS: Record<string, string> = {
  queued: 'en cola',
  running: 'en ejecución',
  verifying: 'en verificación',
  deploying_dev: 'desplegándose a desarrollo',
  preview: 'en vista previa esperando tu confirmación',
  deploying_prod: 'publicándose a producción',
};

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

const IMAGE_TYPES = new Set<Anthropic.Base64ImageSource['media_type']>(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
// Text-like files are sent as plain-text documents (decoded from the data URL).
const TEXT_TYPES = new Set([
  'text/plain',
  'text/markdown',
  'text/csv',
  'text/tab-separated-values',
  'application/json',
  'application/geo+json',
]);
// Word/Excel are not accepted by the Claude API as documents; the UI no longer offers them.
const ALLOWED_TYPES = new Set<string>([...IMAGE_TYPES, 'application/pdf', ...TEXT_TYPES]);

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

function base64Payload(dataUrl: string): string {
  return dataUrl.slice(dataUrl.indexOf(',') + 1);
}

function attachmentBlock(file: Attachment): Anthropic.ContentBlockParam {
  const data = base64Payload(file.data);
  if (IMAGE_TYPES.has(file.type as Anthropic.Base64ImageSource['media_type'])) {
    return { type: 'image', source: { type: 'base64', media_type: file.type as Anthropic.Base64ImageSource['media_type'], data } };
  }
  if (file.type === 'application/pdf') {
    return { type: 'document', title: file.name, source: { type: 'base64', media_type: 'application/pdf', data } };
  }
  return {
    type: 'document',
    title: file.name,
    source: { type: 'text', media_type: 'text/plain', data: Buffer.from(data, 'base64').toString('utf8') },
  };
}

function classifyError(error: unknown): { status: number; message: string } {
  if (error instanceof Anthropic.AuthenticationError) return { status: 502, message: 'La API key del asistente no es válida.' };
  if (error instanceof Anthropic.RateLimitError) return { status: 503, message: 'El asistente está saturado, intenta de nuevo en un momento.' };
  if (error instanceof Anthropic.BadRequestError) return { status: 502, message: 'El asistente rechazó la solicitud (revisa los archivos adjuntos).' };
  if (error instanceof Anthropic.APIConnectionTimeoutError) return { status: 504, message: 'El asistente tardó demasiado.' };
  if (error instanceof Anthropic.APIError) return { status: 502, message: 'El asistente no pudo procesar la solicitud.' };
  return { status: 504, message: 'El asistente tardó demasiado o no está disponible.' };
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

  const apiKey = (import.meta.env.ANTHROPIC_API_KEY ?? process.env.ANTHROPIC_API_KEY)?.trim();
  if (!apiKey) return Response.json({ error: 'La API key del asistente todavía no está configurada.' }, { status: 503 });
  const model = (import.meta.env.ANTHROPIC_MODEL ?? process.env.ANTHROPIC_MODEL)?.trim() || DEFAULT_MODEL;

  let openJob: Awaited<ReturnType<typeof findOpenJob>> = null;
  try {
    openJob = await findOpenJob();
  } catch (error) {
    console.error('[admin/chat] findOpenJob failed', error);
  }
  const statusLine = openJob
    ? `Cambio abierto ${openJob.id} en estado ${STATUS_LABELS[openJob.status] ?? openJob.status}: ${openJob.summary}`
    : 'Sin cambios abiertos.';
  const system = `${ADMIN_SYSTEM_PROMPT}\n\nEstado actual del ejecutor de cambios: ${statusLine}`;

  const history: Anthropic.MessageParam[] = messages.slice(-12).map((message, index, visibleMessages) => {
    const isLatest = index === visibleMessages.length - 1;
    if (!isLatest) return { role: message.role, content: message.content };
    const content: Anthropic.ContentBlockParam[] = [
      ...attachments.map(attachmentBlock),
      { type: 'text', text: message.content },
    ];
    return { role: message.role, content };
  });

  const client = new Anthropic({ apiKey, timeout: 90_000, maxRetries: 1 });

  try {
    // Opus 5 may decline a request via its safety classifiers; `fallbacks: 'default'`
    // re-runs a declined request on Anthropic's recommended fallback model server-side.
    const response = await client.beta.messages.create({
      model,
      max_tokens: 4000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      system,
      messages: history,
      tools: [SUBMIT_CHANGE_TOOL],
    });

    if (response.stop_reason === 'refusal') {
      console.error('[admin/chat] refusal', response.stop_details);
      return Response.json({ error: 'El asistente no pudo atender esta solicitud.' }, { status: 502 });
    }

    const outputText = response.content
      .filter((block): block is Anthropic.Beta.BetaTextBlock => block.type === 'text')
      .map((block) => block.text)
      .join('\n')
      .trim();
    const toolUse = response.content.find(
      (block): block is Anthropic.Beta.BetaToolUseBlock => block.type === 'tool_use' && block.name === SUBMIT_CHANGE_TOOL.name,
    );

    if (toolUse) {
      const { summary, instruction } = (toolUse.input ?? {}) as { summary?: unknown; instruction?: unknown };
      if (
        typeof summary !== 'string' || !summary.trim() || summary.length > LIMITS.summary ||
        typeof instruction !== 'string' || !instruction.trim() || instruction.length > LIMITS.instruction
      ) {
        console.error('[admin/chat] submit_change_request returned an invalid proposal', { summary, instruction });
        return Response.json({ error: 'El asistente generó una propuesta inválida. Intenta reformular tu pedido.' }, { status: 502 });
      }
      return Response.json(
        {
          message: outputText || DEFAULT_PROPOSAL_MESSAGE,
          proposal: { summary: summary.trim(), instruction: instruction.trim() },
          mode: 'proposal',
        },
        { headers: { 'cache-control': 'no-store' } },
      );
    }

    if (!outputText) return Response.json({ error: 'El asistente devolvió una respuesta vacía.' }, { status: 502 });
    return Response.json({ message: outputText, mode: 'proposal' }, { headers: { 'cache-control': 'no-store' } });
  } catch (error) {
    console.error('[admin/chat] Request failed', error);
    const { status, message } = classifyError(error);
    return Response.json({ error: message }, { status });
  }
};
