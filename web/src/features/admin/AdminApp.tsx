import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { ADMIN_CAPABILITIES, ADMIN_RESTRICTIONS } from '../../lib/admin/policy';
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

const ACCEPTED_TYPES = '.png,.jpg,.jpeg,.webp,.gif,.pdf,.docx,.xlsx,.csv,.tsv,.txt,.md,.json,.geojson';
const MAX_FILE_BYTES = 2 * 1024 * 1024;
const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

const QUICK_ACTIONS = [
  { label: 'Editar la landing', prompt: 'Quiero modificar el contenido y la estructura de la landing page.' },
  { label: 'Agregar punto al mapa', prompt: 'Quiero agregar un nuevo punto al mapa. Ayúdame a validar la información necesaria.' },
  { label: 'Subir un modelo', prompt: 'Quiero incorporar un nuevo modelo al laboratorio. Ayúdame a preparar sus datos y archivos.' },
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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
      const result = await response.json() as { message?: string; error?: string };
      if (response.status === 401) {
        setView('login');
        throw new Error('Tu sesión expiró. Inicia sesión nuevamente.');
      }
      if (!response.ok || !result.message) throw new Error(result.error || 'No fue posible obtener una respuesta.');
      setMessages((current) => [...current, { role: 'assistant', content: result.message! }]);
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
            <p>Ingresa para conversar con el asistente de contenido y datos de NATURA 2030.</p>
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
          <button className="admin-icon-button" type="button" onClick={toggleTheme} aria-label="Cambiar tema">◐</button>
          <button className="admin-text-button" type="button" onClick={logout}>Cerrar sesión</button>
        </div>
      </header>

      <aside className={`admin-policy ${showPolicy ? 'is-open' : ''}`}>
        <div className="admin-policy-heading"><div><span className="admin-kicker">Permisos del agente</span><h2>Alcance controlado</h2></div><button type="button" onClick={() => setShowPolicy(false)} aria-label="Cerrar reglas">×</button></div>
        <section><h3>Puede ayudarte con</h3><ul className="admin-allowed">{ADMIN_CAPABILITIES.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3>No puede hacer</h3><ul className="admin-blocked">{ADMIN_RESTRICTIONS.map((item) => <li key={item}>{item}</li>)}</ul></section>
        <div className="admin-phase-note"><strong>Entorno actual: modo propuesta</strong><p>Hasta conectar el ejecutor privado en la VPS, el asistente analiza y prepara cambios sin modificar ni publicar el sitio.</p></div>
      </aside>

      <section className="admin-chat">
        <div className="admin-chat-topline"><div><span className="admin-kicker">Asistente editorial y de datos</span><h1>Conversa con NATURA</h1></div><button type="button" onClick={() => setShowPolicy(true)}>Ver reglas</button></div>

        <div className="admin-messages" aria-live="polite">
          {messages.length === 0 ? (
            <div className="admin-welcome">
              <div className="admin-agent-mark"><img src="/favicon.svg" alt="" /></div>
              <h2>¿Qué quieres actualizar?</h2>
              <p>Puedo ayudarte a preparar cambios para la landing, validar un punto del mapa o incorporar un modelo al laboratorio.</p>
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
    </main>
  );
}
