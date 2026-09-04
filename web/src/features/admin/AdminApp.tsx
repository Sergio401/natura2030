import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ADMIN_CAPABILITIES, ADMIN_RESTRICTIONS } from '../../lib/admin/policy';
import type { Job, JobStatus } from '../../lib/admin/jobs-types';
import './admin.css';

type View = 'loading' | 'login' | 'chat';
type Role = 'user' | 'assistant';

interface Message {
  role: Role;
  content: string;
  files?: string[];
}

interface PendingFile {
  name: string;
  type: string;
  data: string;
  size: number;
}

interface Proposal {
  summary: string;
  instruction: string;
}

const ACCEPTED_TYPES = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.csv,.tsv,.txt,.md,.json,.geojson';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;
const POLL_INTERVAL_MS = 3000;
const POLL_WARNING_AFTER_MS = 60_000;

const TERMINAL_STATUSES = new Set<JobStatus>(['done', 'failed', 'discarded']);

const STATUS_LABELS: Record<JobStatus, string> = {
  queued: 'En cola',
  running: 'Editando con IA',
  verifying: 'Verificando (check y build)',
  deploying_dev: 'Desplegando a desarrollo',
  preview: 'Vista previa lista',
  deploying_prod: 'Publicando en producción',
  done: 'Publicado',
  failed: 'Falló',
  discarded: 'Descartado',
};

const QUICK_ACTIONS = [
  { label: 'Editar el titular', prompt: 'Quiero cambiar el titular del hero de la landing page.' },
  { label: 'Actualizar un texto', prompt: 'Quiero actualizar un texto de la landing page.' },
  { label: 'Ajustar un color', prompt: 'Quiero ajustar un color o token visual de la landing page.' },
];

function readFile(file: File): Promise<PendingFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type || inferMime(file.name), data: String(reader.result), size: file.size });
    reader.onerror = () => reject(new Error(`No se pudo leer ${file.name}`));
    reader.readAsDataURL(file);
  });
}

function inferMime(name: string): string {
  const extension = name.split('.').pop()?.toLowerCase();
  const types: Record<string, string> = {
    csv: 'text/csv', tsv: 'text/tab-separated-values', txt: 'text/plain', md: 'text/markdown',
    json: 'application/json', geojson: 'application/geo+json', pdf: 'application/pdf',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
  return types[extension ?? ''] ?? 'application/octet-stream';
}

function formatBytes(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString('es', { dateStyle: 'medium', timeStyle: 'short' });
  } catch {
    return iso;
  }
}

function shortCommit(commit: string | undefined): string {
  return commit ? commit.slice(0, 7) : '—';
}

function shortFiles(files: string[]): string {
  if (files.length === 0) return '—';
  return files.map((file) => file.split('/').pop() || file).join(', ');
}

export default function AdminApp() {
  const [view, setView] = useState<View>('loading');
  const [configured, setConfigured] = useState(true);
  const [authError, setAuthError] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [files, setFiles] = useState<PendingFile[]>([]);
  const [error, setError] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [showPolicy, setShowPolicy] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [openJob, setOpenJob] = useState<Job | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [jobsError, setJobsError] = useState('');
  const [pollWarning, setPollWarning] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [feedbackText, setFeedbackText] = useState('');

  useEffect(() => {
    fetch('/api/admin/session/', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((session: { authenticated?: boolean; configured?: boolean }) => {
        setConfigured(Boolean(session.configured));
        setView(session.authenticated ? 'chat' : 'login');
      })
      .catch(() => {
        setConfigured(false);
        setView('login');
      });
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isSending]);

  async function loadJobs() {
    setJobsError('');
    try {
      const response = await fetch('/api/admin/jobs/', { credentials: 'same-origin' });
      if (response.status === 401) {
        setView('login');
        return;
      }
      if (!response.ok) throw new Error('No fue posible cargar el historial de cambios.');
      const data = await response.json() as { jobs?: Job[] };
      const list = data.jobs ?? [];
      setJobs(list);
      setOpenJob(list.find((job) => !TERMINAL_STATUSES.has(job.status)) ?? null);
    } catch (loadError) {
      setJobsError(loadError instanceof Error ? loadError.message : 'No fue posible cargar el historial de cambios.');
    }
  }

  // Observer: load the job history (and any open job) once the chat view is ready.
  useEffect(() => {
    if (view === 'chat') void loadJobs();
  }, [view]);

  // Poll the open job every 3s. Network errors are expected (the server
  // restarts mid-deploy): retry silently for up to 60s before surfacing a
  // soft warning, and recover automatically once a poll succeeds again.
  useEffect(() => {
    const id = openJob?.id;
    if (!id) return;
    let cancelled = false;
    let failSince: number | null = null;

    async function tick() {
      try {
        const response = await fetch(`/api/admin/jobs/${id}/`, { credentials: 'same-origin' });
        if (cancelled) return;
        if (response.status === 401) {
          setView('login');
          return;
        }
        if (!response.ok) throw new Error('poll failed');
        const data = await response.json() as { job?: Job };
        if (!data.job) throw new Error('poll failed');
        failSince = null;
        setPollWarning(false);
        if (TERMINAL_STATUSES.has(data.job.status)) {
          setOpenJob(null);
          void loadJobs();
        } else {
          setOpenJob(data.job);
        }
      } catch {
        if (cancelled) return;
        if (failSince === null) failSince = Date.now();
        else if (Date.now() - failSince > POLL_WARNING_AFTER_MS) setPollWarning(true);
      }
    }

    const interval = setInterval(() => void tick(), POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [openJob?.id]);

  async function login(event: { preventDefault(): void }) {
    event.preventDefault();
    setAuthError('');
    setIsLoggingIn(true);
    try {
      const response = await fetch('/api/admin/login/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ username, password }),
      });
      const result = await response.json() as { error?: string };
      if (!response.ok) throw new Error(result.error || 'No fue posible iniciar sesión.');
      setPassword('');
      setView('chat');
    } catch (loginError) {
      setAuthError(loginError instanceof Error ? loginError.message : 'No fue posible iniciar sesión.');
    } finally {
      setIsLoggingIn(false);
    }
  }

  async function logout() {
    await fetch('/api/admin/logout/', { method: 'POST', credentials: 'same-origin' }).catch(() => undefined);
    setMessages([]);
    setFiles([]);
    setInput('');
    setProposal(null);
    setOpenJob(null);
    setJobs([]);
    setView('login');
  }

  async function addFiles(selected: FileList | null) {
    if (!selected) return;
    setError('');
    const incoming = Array.from(selected);
    if (files.length + incoming.length > 4) {
      setError('Puedes adjuntar hasta 4 archivos por mensaje.');
      return;
    }
    if (incoming.some((file) => file.size > MAX_FILE_BYTES)) {
      setError('Cada archivo puede pesar hasta 2 MB.');
      return;
    }
    if (files.reduce((sum, file) => sum + file.size, 0) + incoming.reduce((sum, file) => sum + file.size, 0) > MAX_TOTAL_BYTES) {
      setError('El total de archivos puede pesar hasta 4 MB.');
      return;
    }
    try {
      const loadedFiles = await Promise.all(incoming.map(readFile));
      setFiles((current) => [...current, ...loadedFiles]);
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : 'No fue posible leer los archivos.');
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function send(forcedPrompt?: string) {
    const text = (forcedPrompt ?? input).trim();
    if ((!text && files.length === 0) || isSending) return;

    const userMessage: Message = {
      role: 'user',
      content: text || 'Analiza los archivos adjuntos y dime qué información puedes preparar.',
      files: files.map((file) => file.name),
    };
    const nextMessages = [...messages, userMessage];
    const sentFiles = files;
    setMessages(nextMessages);
    setInput('');
    setFiles([]);
    setError('');
    setIsSending(true);

    try {
      const response = await fetch('/api/admin/chat/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ messages: nextMessages.map(({ role, content }) => ({ role, content })), attachments: sentFiles }),
      });
      const result = await response.json() as { message?: string; error?: string; proposal?: Proposal };
      if (response.status === 401) {
        setView('login');
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }
      if (!response.ok || !result.message) throw new Error(result.error || 'No fue posible obtener una respuesta.');
      setMessages((current) => [...current, { role: 'assistant', content: result.message! }]);
      if (result.proposal) setProposal(result.proposal);
    } catch (sendError) {
      setError(sendError instanceof Error ? sendError.message : 'No fue posible obtener una respuesta.');
      setFiles(sentFiles);
    } finally {
      setIsSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      void send();
    }
  }

  function toggleTheme() {
    const root = document.documentElement;
    const next = root.dataset.theme === 'dark' ? 'light' : 'dark';
    root.dataset.theme = next;
    localStorage.setItem('natura-theme', next);
  }

  async function confirmProposal() {
    if (!proposal || openJob || actionBusy) return;
    setActionBusy(true);
    setError('');
    try {
      const response = await fetch('/api/admin/jobs/', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ summary: proposal.summary, instruction: proposal.instruction }),
      });
      const data = await response.json() as { job?: Job; error?: string };
      if (response.status === 401) {
        setView('login');
        return;
      }
      if (response.status === 409 && data.job) {
        setOpenJob(data.job);
        throw new Error(data.error || 'Ya hay un cambio abierto.');
      }
      if (!response.ok || !data.job) throw new Error(data.error || 'No fue posible crear el cambio.');
      setOpenJob(data.job);
      setProposal(null);
      void loadJobs();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : 'No fue posible crear el cambio.');
    } finally {
      setActionBusy(false);
    }
  }

  function discardProposal() {
    setProposal(null);
  }

  async function sendJobAction(type: 'approve' | 'discard' | 'feedback', feedbackInstruction?: string) {
    if (!openJob || actionBusy) return;
    setActionBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/admin/jobs/${openJob.id}/action/`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(feedbackInstruction ? { type, instruction: feedbackInstruction } : { type }),
      });
      const data = await response.json() as { job?: Job; error?: string };
      if (response.status === 401) {
        setView('login');
        return;
      }
      if (!response.ok || !data.job) throw new Error(data.error || 'No fue posible registrar la acción.');
      setOpenJob(data.job);
      setShowFeedback(false);
      setFeedbackText('');
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : 'No fue posible registrar la acción.');
    } finally {
      setActionBusy(false);
    }
  }

  function approveJob() {
    if (!window.confirm('¿Publicar este cambio en producción? Esta acción es definitiva.')) return;
    void sendJobAction('approve');
  }

  function discardJob() {
    if (!window.confirm('¿Descartar este cambio? Se perderá el trabajo hecho en desarrollo.')) return;
    void sendJobAction('discard');
  }

  function submitFeedback(event: { preventDefault(): void }) {
    event.preventDefault();
    const text = feedbackText.trim();
    if (!text) return;
    void sendJobAction('feedback', text);
  }

  if (view === 'loading') {
    return <main className="admin-loading" id="main"><span className="admin-loader" /><p>Preparando el espacio de trabajo…</p></main>;
  }

  if (view === 'login') {
    return (
      <main className="admin-login" id="main">
        <section className="admin-login-card">
          <a className="admin-brand" href="/"><img src="/favicon.svg" alt="" /><span>ADAPTATION LATIN AMERICA<small>NATURA 2030</small></span></a>
          <button className="admin-login-theme" type="button" onClick={toggleTheme} aria-label="Cambiar entre modo claro y oscuro">◐</button>
          <div className="admin-login-heading">
            <span className="admin-kicker">Acceso restringido</span>
            <h1>Centro de edición</h1>
            <p>Ingresa para conversar con el asistente editorial de NATURA 2030.</p>
          </div>
          {!configured && <div className="admin-alert">El administrador todavía no está configurado. Agrega las variables de entorno indicadas en <code>.env.example</code>.</div>}
          <form onSubmit={login}>
            <label>Usuario<input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} required /></label>
            <label>Contraseña<input type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
            {authError && <p className="admin-form-error" role="alert">{authError}</p>}
            <button type="submit" disabled={isLoggingIn || !configured}>{isLoggingIn ? 'Verificando…' : 'Ingresar'}</button>
          </form>
          <a className="admin-back-link" href="/">← Volver al sitio</a>
        </section>
        <aside className="admin-login-context" aria-hidden="true"><span>Contenido</span><span>Mapa</span><span>Modelos</span><strong>Una conversación.<br />Cambios controlados.</strong></aside>
      </main>
    );
  }

  return (
    <main className="admin-shell" id="main">
      <header className="admin-header">
        <a className="admin-brand" href="/"><img src="/favicon.svg" alt="" /><span>ADAPTATION LATIN AMERICA<small>NATURA 2030 · ADMIN</small></span></a>
        <div className="admin-header-actions">
          <span className="admin-mode"><i />Modo propuesta</span>
          <button className="admin-status-toggle" type="button" onClick={() => setShowStatus(true)}>
            Cambios{openJob ? ' ●' : ''}
          </button>
          <button className="admin-icon-button" type="button" onClick={toggleTheme} aria-label="Cambiar tema">◐</button>
          <button className="admin-text-button" type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <aside className={`admin-policy ${showPolicy ? 'is-open' : ''}`}>
        <div className="admin-policy-heading"><div><span className="admin-kicker">Permisos del agente</span><h2>Alcance controlado</h2></div><button type="button" onClick={() => setShowPolicy(false)} aria-label="Cerrar reglas">×</button></div>
        <section><h3>Puede ayudarte con</h3><ul className="admin-allowed">{ADMIN_CAPABILITIES.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>No puede hacer (todavía)</h3><ul className="admin-blocked">{ADMIN_RESTRICTIONS.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <div className="admin-phase-note"><strong>Cómo se publica un cambio</strong><p>Cuando confirmas una propuesta, el ejecutor la aplica, la verifica y la publica en un sitio de desarrollo para tu revisión. Solo pasa a producción cuando la confirmas por segunda vez.</p></div>
      </aside>

      <section className="admin-chat">
        <div className="admin-chat-topline">
          <div><span className="admin-kicker">Asistente editorial</span><h1>Conversa con NATURA</h1></div>
          <button type="button" onClick={() => setShowPolicy(true)}>Ver reglas</button>
        </div>

        <div className="admin-messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="admin-welcome">
              <div className="admin-agent-mark"><img src="/favicon.svg" alt="" /></div>
              <h2>¿Qué quieres actualizar?</h2>
              <p>Puedo ayudarte a preparar cambios de texto y estructura para la landing page. El mapa y los modelos todavía no están disponibles.</p>
              <div className="admin-quick-actions">{QUICK_ACTIONS.map((action) => <button type="button" key={action.label} onClick={() => void send(action.prompt)}>{action.label}<span>↗</span></button>)}</div>
            </div>
          ) : messages.map((message, index) => (
            <article className={`admin-message is-${message.role}`} key={`${message.role}-${index}`}>
              <span className="admin-message-role">{message.role === 'user' ? 'Tú' : 'NATURA'}</span>
              <div>{message.content.split('\n').map((line, lineIndex) => <p key={lineIndex}>{line || <br />}</p>)}</div>
              {message.files && message.files.length > 0 && <div className="admin-message-files">{message.files.map((file) => <span key={file}>{file}</span>)}</div>}
            </article>
          ))}
          {isSending && <article className="admin-message is-assistant"><span className="admin-message-role">NATURA</span><div className="admin-thinking"><i /><i /><i /></div></article>}
          <div ref={messagesEndRef} />
        </div>

        {proposal && (
          <div className="admin-proposal">
            <div className="admin-proposal-head">
              <span className="admin-kicker">Propuesta de cambio</span>
              <p>{proposal.summary}</p>
            </div>
            <details className="admin-proposal-details">
              <summary>Ver instrucción completa</summary>
              <pre>{proposal.instruction}</pre>
            </details>
            {openJob && <p className="admin-proposal-blocked">Ya hay un cambio en curso ({STATUS_LABELS[openJob.status] ?? openJob.status}). Espera a que termine para confirmar esta propuesta.</p>}
            <div className="admin-proposal-actions">
              <button type="button" className="admin-btn-primary" onClick={() => void confirmProposal()} disabled={!!openJob || actionBusy}>
                {actionBusy ? 'Enviando…' : 'Confirmar y ejecutar'}
              </button>
              <button type="button" className="admin-btn-ghost" onClick={discardProposal} disabled={actionBusy}>Descartar propuesta</button>
            </div>
          </div>
        )}

        <div className="admin-composer-wrap">
          {error && <div className="admin-error" role="alert"><span>{error}</span><button type="button" onClick={() => setError('')} aria-label="Cerrar">×</button></div>}
          {files.length > 0 && <div className="admin-files">{files.map((file, index) => <span key={`${file.name}-${index}`}><b>{file.name}</b><small>{formatBytes(file.size)}</small><button type="button" onClick={() => setFiles((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`Quitar ${file.name}`}>×</button></span>)}</div>}
          <div className="admin-composer">
            <button className="admin-attach" type="button" onClick={() => fileInputRef.current?.click()} aria-label="Adjuntar archivos" title="Adjuntar archivos">+</button>
            <input ref={fileInputRef} type="file" accept={ACCEPTED_TYPES} multiple hidden onChange={(event) => void addFiles(event.target.files)} />
            <textarea value={input} onChange={(event) => setInput(event.target.value)} onKeyDown={handleKeyDown} placeholder="Describe el cambio que quieres hacer…" rows={1} disabled={isSending} />
            <button className="admin-send" type="button" onClick={() => void send()} disabled={isSending || (!input.trim() && files.length === 0)} aria-label="Enviar">↑</button>
          </div>
          <p className="admin-composer-help">Imágenes, PDF, Word, Excel, CSV, JSON y GeoJSON · 2 MB por archivo · Enter para enviar</p>
        </div>
      </section>

      <aside className={`admin-status ${showStatus ? 'is-open' : ''}`}>
        <div className="admin-policy-heading">
          <div><span className="admin-kicker">Estado del ejecutor</span><h2>Cambios</h2></div>
          <button type="button" onClick={() => setShowStatus(false)} aria-label="Cerrar panel de cambios">×</button>
        </div>

        {openJob ? (
          <section className="admin-job-panel">
            <h3>Cambio en curso</h3>
            <p className="admin-job-status">{STATUS_LABELS[openJob.status] ?? openJob.status}</p>
            <p className="admin-job-summary">{openJob.summary}</p>
            {pollWarning && <p className="admin-job-warning" role="alert">No se pudo actualizar el estado en los últimos segundos. Seguimos intentando…</p>}

            <ol className="admin-job-timeline">
              {openJob.log.map((entry, index) => (
                <li key={index}>
                  <time>{formatDateTime(entry.at)}</time>
                  <span>{entry.message}</span>
                </li>
              ))}
            </ol>

            {openJob.dev?.url && (
              <a className="admin-job-dev-link" href={openJob.dev.url} target="_blank" rel="noreferrer">Ver en el sitio de desarrollo →</a>
            )}
            {openJob.diffStat && <pre className="admin-job-diff">{openJob.diffStat}</pre>}
            {openJob.changedFiles.length > 0 && (
              <div className="admin-job-files">{openJob.changedFiles.map((file) => <span key={file}>{file}</span>)}</div>
            )}
            {openJob.error && <p className="admin-job-error" role="alert">{openJob.error}</p>}

            {openJob.status === 'preview' && (
              <div className="admin-job-actions">
                {openJob.action && <p className="admin-job-processing">Procesando…</p>}
                <button type="button" className="admin-btn-primary" onClick={approveJob} disabled={!!openJob.action || actionBusy}>Publicar en producción</button>
                <button type="button" className="admin-btn-ghost" onClick={() => setShowFeedback((current) => !current)} disabled={!!openJob.action || actionBusy}>Pedir ajustes</button>
                <button type="button" className="admin-btn-danger" onClick={discardJob} disabled={!!openJob.action || actionBusy}>Descartar</button>
                {showFeedback && (
                  <form className="admin-feedback-form" onSubmit={submitFeedback}>
                    <textarea
                      value={feedbackText}
                      onChange={(event) => setFeedbackText(event.target.value)}
                      placeholder="Describe el ajuste que necesitas…"
                      rows={3}
                      disabled={!!openJob.action || actionBusy}
                    />
                    <button type="submit" disabled={!feedbackText.trim() || !!openJob.action || actionBusy}>Enviar ajuste</button>
                  </form>
                )}
              </div>
            )}
          </section>
        ) : (
          <p className="admin-job-empty">No hay ningún cambio en curso.</p>
        )}

        <section className="admin-history">
          <div className="admin-history-head">
            <h3>Historial de cambios</h3>
            <button type="button" onClick={() => void loadJobs()}>Actualizar</button>
          </div>
          {jobsError && <p className="admin-job-error" role="alert">{jobsError}</p>}
          <div className="admin-history-table-wrap">
            <table className="admin-history-table">
              <thead>
                <tr><th>Fecha</th><th>Resumen</th><th>Estado</th><th>Dev</th><th>Prod</th><th>Archivos</th></tr>
              </thead>
              <tbody>
                {jobs.length === 0 && <tr><td colSpan={6}>Todavía no hay cambios.</td></tr>}
                {jobs.map((job) => (
                  <tr key={job.id}>
                    <td>{formatDateTime(job.createdAt)}</td>
                    <td>{job.summary}</td>
                    <td>{STATUS_LABELS[job.status] ?? job.status}</td>
                    <td>{shortCommit(job.dev?.commit)}</td>
                    <td>{shortCommit(job.prod?.commit)}</td>
                    <td>{shortFiles(job.changedFiles)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </aside>
    </main>
  );
}
