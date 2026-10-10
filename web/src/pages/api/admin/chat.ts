import type { APIRoute } from 'astro';
import { hasValidSession, isSameOrigin } from '../../../lib/admin/auth';
import { ADMIN_SYSTEM_PROMPT } from '../../../lib/admin/policy';
import { ATTACHMENT_LIMITS, ATTACHMENT_TYPES, findOpenJob, LIMITS } from '../../../../agent/lib/store.mjs';

export const prerender = false;

// The chat ("processing" block) talks to the OpenAI API with a server-side
// API key. This is independent from the executor: agent/worker.mjs drives
// `claude -p` with the operator's claude.ai login and deliberately strips
// ANTHROPIC_API_KEY from that process's environment — unaffected by this file.
const DEFAULT_MODEL = 'gpt-5.6-luna';

const SUBMIT_CHANGE_TOOL = {
  type: 'function',
  name: 'submit_change_request',
  description: 'Enviar al ejecutor una solicitud de cambio dentro del alcance permitido (textos, estilos, imágenes y paneles de la landing, puntos del mapa, modelos de Python), una vez entendida y validada con el usuario. Los archivos adjuntos de la conversación viajan con la solicitud.',
  parameters: {
    type: 'object',
    properties: {
      summary: { type: 'string', description: 'Una línea para el historial, máximo 140 caracteres.' },
      instruction: { type: 'string', description: 'Instrucción completa y autocontenida para el agente de código: qué archivos tocar, qué texto cambiar, en qué idioma(s), y qué no tocar.' },
    },
    required: ['summary', 'instruction'],
    additionalProperties: false,
  },
  strict: true,
} as const;

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
  files?: string[];
}

interface Attachment {
  name: string;
  type: string;
  data: string;
  size: number;
}

const MAX_BODY_BYTES = 8 * 1024 * 1024;
const MAX_TEXT_FILE_CHARS = 40_000;

// Same list as the job store (agent/lib/store.mjs), so whatever the chat
// accepts can also travel with the job. The admin UI mirrors it.
const ALLOWED_TYPES = new Set(Object.keys(ATTACHMENT_TYPES));

function validMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length <= 20 && value.every((message) =>
    message &&
    typeof message === 'object' &&
    ((message as ChatMessage).role === 'user' || (message as ChatMessage).role === 'assistant') &&
    typeof (message as ChatMessage).content === 'string' &&
    (message as ChatMessage).content.length <= 8_000 &&
    ((message as ChatMessage).files === undefined || (
      Array.isArray((message as ChatMessage).files) &&
      ((message as ChatMessage).files as unknown[]).every((name) => typeof name === 'string' && name.length <= 180)
    )),
  );
}

function validAttachments(value: unknown): value is Attachment[] {
  if (!Array.isArray(value) || value.length > ATTACHMENT_LIMITS.count) return false;
  let total = 0;
  for (const file of value) {
    if (!file || typeof file !== 'object') return false;
    const item = file as Attachment;
    if (
      typeof item.name !== 'string' || item.name.length > 180 ||
      typeof item.type !== 'string' || !ALLOWED_TYPES.has(item.type) ||
      typeof item.data !== 'string' || !item.data.startsWith(`data:${item.type};base64,`) ||
      typeof item.size !== 'number' || item.size <= 0 || item.size > ATTACHMENT_LIMITS.fileBytes
    ) return false;
    total += item.size;
  }
  return total <= ATTACHMENT_LIMITS.totalBytes;
}

function decodeText(dataUrl: string): string {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const text = Buffer.from(base64, 'base64').toString('utf8');
  return text.length > MAX_TEXT_FILE_CHARS ? `${text.slice(0, MAX_TEXT_FILE_CHARS)}\n[…archivo recortado]` : text;
}

function isTextType(type: string): boolean {
  return type.startsWith('text/') || type === 'application/json' || type === 'application/geo+json';
}

// Earlier turns only keep their text, so tell the model which files a turn
// carried: it can still refer to them by name in the instruction.
function withFileNote(message: ChatMessage): string {
  if (!message.files || message.files.length === 0) return message.content;
  return `${message.content}\n\n[Archivos adjuntos en este mensaje: ${message.files.join(', ')}]`;
}

interface ResponsesOutputItem {
  type?: string;
  content?: Array<{ type?: string; text?: string }>;
  name?: string;
  arguments?: string;
}

function extractOutputText(payload: unknown): string {
  const response = payload as { output_text?: unknown; output?: ResponsesOutputItem[] };
  if (typeof response.output_text === 'string' && response.output_text.trim()) return response.output_text.trim();
  return (response.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === 'output_text' && typeof item.text === 'string')
    .map((item) => item.text)
    .join('\n')
    .trim();
}

function extractChangeRequestArgs(payload: unknown): { summary: unknown; instruction: unknown } | null {
  const response = payload as { output?: ResponsesOutputItem[] };
  const call = (response.output ?? []).find(
    (item) => item.type === 'function_call' && item.name === 'submit_change_request' && typeof item.arguments === 'string',
  );
  if (!call) return null;
  try {
    const parsed = JSON.parse(call.arguments as string) as { summary?: unknown; instruction?: unknown };
    return { summary: parsed.summary, instruction: parsed.instruction };
  } catch {
    return null;
  }
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
  const model = (import.meta.env.OPENAI_MODEL ?? process.env.OPENAI_MODEL)?.trim() || DEFAULT_MODEL;

  let openJob: Awaited<ReturnType<typeof findOpenJob>> = null;
  try {
    openJob = await findOpenJob();
  } catch (error) {
    console.error('[admin/chat] findOpenJob failed', error);
  }
  const statusLine = openJob
    ? `Cambio abierto ${openJob.id} en estado ${STATUS_LABELS[openJob.status] ?? openJob.status}: ${openJob.summary}`
    : 'Sin cambios abiertos.';
  const instructions = `${ADMIN_SYSTEM_PROMPT}\n\nEstado actual del ejecutor de cambios: ${statusLine}`;

  const input = messages.slice(-12).map((message, index, visibleMessages) => {
    const isLatest = index === visibleMessages.length - 1;
    if (!isLatest) return { role: message.role, content: withFileNote(message) };
    const content: Array<Record<string, unknown>> = [{ type: 'input_text', text: withFileNote(message) }];
    for (const file of attachments) {
      if (file.type.startsWith('image/')) {
        content.push({ type: 'input_text', text: `Imagen adjunta: ${file.name}` });
        content.push({ type: 'input_image', image_url: file.data, detail: 'high' });
      } else if (isTextType(file.type)) {
        content.push({ type: 'input_text', text: `Contenido del archivo adjunto ${file.name}:\n${decodeText(file.data)}` });
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
        model,
        instructions,
        input,
        tools: [SUBMIT_CHANGE_TOOL],
        tool_choice: 'auto',
        store: false,
        max_output_tokens: 6000,
      }),
      signal: AbortSignal.timeout(90_000),
    });

    if (!response.ok) {
      const detail = await response.text();
      console.error('[admin/chat] OpenAI error', response.status, detail.slice(0, 800));
      const message = response.status === 401
        ? 'La API key del asistente no es válida.'
        : response.status === 429
          ? 'El asistente está saturado, intenta de nuevo en un momento.'
          : 'El asistente no pudo procesar la solicitud.';
      return Response.json({ error: message }, { status: 502 });
    }
    const payload = await response.json();
    const outputText = extractOutputText(payload);
    const changeRequest = extractChangeRequestArgs(payload);

    if (changeRequest) {
      const { summary, instruction } = changeRequest;
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
    return Response.json({ error: 'El asistente tardó demasiado o no está disponible.' }, { status: 504 });
  }
};
