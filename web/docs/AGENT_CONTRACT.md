# Contrato del ejecutor de cambios (web ↔ worker)

Este documento es la fuente de verdad compartida entre la app web (Astro, `src/`) y el worker
de ejecución (`agent/`). Cualquier cambio de esquema o de transiciones se hace aquí primero.

## Visión general

```
cliente ──chat──▶ /admin (API de Claude, ANTHROPIC_API_KEY del servidor)
                    │  tool call submit_change_request → propuesta
                    │  confirmación 1 (usuario) → POST /api/admin/jobs
                    ▼
            ~/natura-agent/jobs/<id>.json   ◀──── worker (pm2 natura-agent, usuario sergio)
                    ▲                                 │ claude -p en el worktree dev
                    │ polling GET /api/admin/jobs/:id │ pnpm check + build
                    │                                 │ commit + push dev + pm2 restart natura-dev
                    │                                 ▼
            estado "preview" → el cliente ve https://dev.natura.2-25-153-144.sslip.io
                    │
                    │ confirmación 2 (aprobar) → action approve
                    ▼
            worker: merge --ff-only dev → main, push, build, pm2 restart natura → "done"
```

Reglas fijas:

- **Un solo cambio abierto a la vez.** Abierto = cualquier estado que no sea terminal.
- **Solo texto y estructura de la landing.** El worker rechaza cualquier archivo fuera de la allowlist.
- **El worker nunca corre Bash de Claude.** Claude solo lee y edita archivos. Verificación, build, git y pm2 los ejecuta el worker de forma determinista.
- **Nadie hace commits salvo el worker**, y solo con prefijo `[agent]`.

## Directorios y ramas

| Cosa | Valor por defecto | Variable de entorno |
|---|---|---|
| Datos del agente (jobs, logs, lock) | `~/natura-agent` | `AGENT_DATA_DIR` |
| Checkout de producción (rama prod) | `~/code/natura2030` | `AGENT_PROD_DIR` |
| Worktree de desarrollo (rama dev) | `~/code/natura2030-dev` | `AGENT_DEV_DIR` |
| Rama de producción | `main` | `AGENT_PROD_BRANCH` |
| Rama de desarrollo | `dev` | `AGENT_DEV_BRANCH` |
| URL pública de dev | `https://dev.natura.2-25-153-144.sslip.io` | `AGENT_DEV_URL` |
| Nombre pm2 app prod / dev | `natura` / `natura-dev` | `AGENT_PM2_PROD` / `AGENT_PM2_DEV` |
| Binario de Claude | `claude` | `AGENT_CLAUDE_BIN` |
| Modelo de Claude | `sonnet` | `AGENT_CLAUDE_MODEL` |
| Timeout de una corrida de Claude (ms) | `900000` (15 min) | `AGENT_CLAUDE_TIMEOUT_MS` |
| Rondas automáticas de corrección tras fallo de build | `1` | `AGENT_MAX_FIX_ROUNDS` |
| Hacer `git push` | `true` | `AGENT_GIT_PUSH` |

Mientras la rama `chatbot` no esté mezclada en `main`, en la VPS se usa `AGENT_PROD_BRANCH=chatbot`
y `dev` se corta desde `chatbot`. Al pasar a `main` solo cambia esa variable.

Layout de `AGENT_DATA_DIR`:

```
~/natura-agent/
  jobs/<id>.json          # un archivo por trabajo (estado completo)
  logs/<id>/claude-<n>.json   # salida cruda de `claude -p --output-format json`, una por ronda
  logs/<id>/install.log   # salida de pnpm install
  logs/<id>/check.log     # salida de pnpm check
  logs/<id>/build.log     # salida de pnpm build
  logs/<id>/deploy.log    # git + pm2
  worker.lock             # lock del worker (pid); evita dos workers a la vez
```

Los archivos de job se escriben de forma atómica (escribir a `<id>.json.tmp` y `rename`).
El módulo compartido que lee y escribe jobs es `agent/lib/store.mjs`, importado tanto por el
worker como por los endpoints de Astro. No duplicar esa lógica.

## Allowlist de archivos editables (rutas relativas a `web/`)

```
src/data/content.es.ts
src/data/content.en.ts
src/data/platform-copy.ts
src/data/models-copy.ts
src/themes/v1-nature-distilled/copy.ts
src/themes/v1-nature-distilled/tokens.css
src/themes/v1-nature-distilled/Page.astro
```

Definida una sola vez en `agent/lib/allowlist.mjs` (exporta `ALLOWED_FILES` y `isAllowed(path)`).
Se aplica dos veces: en el hook `PreToolUse` de Claude (bloquea Edit/Write fuera de la lista) y
después de la corrida, sobre `git status --porcelain` del worktree (archivos nuevos, borrados o
modificados fuera de la lista → job `failed` y worktree limpiado).

## Esquema del job (`jobs/<id>.json`)

```jsonc
{
  "id": "20260904-213000-a1b2",          // UTC yyyymmdd-HHMMSS + 4 hex aleatorios; ordena por fecha
  "createdAt": "2026-09-04T21:30:00.000Z",
  "updatedAt": "2026-09-04T21:41:12.000Z",
  "status": "preview",                    // ver máquina de estados
  "summary": "Acortar el titular del hero en español",   // una línea, para el cliente (≤ 140 chars)
  "instruction": "En src/data/content.es.ts ...",        // instrucción completa para Claude
  "requestedBy": "admin",                 // ADMIN_USERNAME de la sesión
  "rounds": [                             // una entrada por invocación de claude -p
    {
      "n": 1,
      "kind": "initial",                  // initial | feedback | autofix
      "startedAt": "...", "finishedAt": "...",
      "instruction": "...",               // lo que se le mandó en esa ronda
      "sessionId": "uuid-de-claude",      // para --resume en rondas siguientes
      "numTurns": 12,
      "costUsd": 0.11,                    // total_cost_usd del JSON de salida (informativo)
      "result": "texto final de Claude",  // campo result del JSON de salida (≤ 4000 chars, recortar)
      "ok": true
    }
  ],
  "action": null,                         // acción pendiente escrita por la web, consumida por el worker
  // "action": { "type": "approve" | "discard" | "feedback", "at": "...", "instruction": "solo feedback" }
  "changedFiles": ["src/data/content.es.ts"],
  "diffStat": " src/data/content.es.ts | 2 +-\n 1 file changed, 1 insertion(+), 1 deletion(-)",
  "dev":  { "commit": "sha", "url": "https://dev.natura....", "deployedAt": "..." },   // null hasta deploying_dev
  "prod": { "commit": "sha", "deployedAt": "..." },                                     // null hasta done
  "error": null,                          // string legible cuando status = failed
  "log": [                                // línea de tiempo, mostrada tal cual en la UI
    { "at": "...", "status": "queued",   "message": "Solicitud recibida." },
    { "at": "...", "status": "running",  "message": "Claude está editando (ronda 1)." },
    { "at": "...", "status": "verifying","message": "pnpm check y build en curso." }
  ]
}
```

## Máquina de estados

Estados terminales: `done`, `failed`, `discarded`.

| Desde | Evento | Hacia | Quién |
|---|---|---|---|
| — | `POST /api/admin/jobs` (sin cambio abierto) | `queued` | web |
| `queued` | worker lo toma; reset del worktree a `origin/<prod>` | `running` | worker |
| `running` | Claude termina OK | `verifying` | worker |
| `running` | Claude falla, timeout o `is_error` | `failed` | worker |
| `verifying` | allowlist OK + `pnpm install --frozen-lockfile` + `pnpm check` OK + `SELF_HOSTED=true pnpm build` OK | `deploying_dev` | worker |
| `verifying` | allowlist viola | `failed` | worker |
| `verifying` | check/build fallan y quedan rondas autofix | `running` (ronda `autofix`, con `--resume`, pasando el error) | worker |
| `verifying` | check/build fallan sin rondas | `failed` | worker |
| `deploying_dev` | commit + push dev + pm2 restart dev OK (el `dist/` ya viene del build de `verifying`) | `preview` | worker |
| `deploying_dev` | falla | `failed` | worker |
| `preview` | `action: approve` | `deploying_prod` | web escribe action, worker transiciona |
| `preview` | `action: feedback` | `running` (ronda `feedback`, con `--resume`) | idem |
| `preview` | `action: discard` | `discarded` (worker resetea dev a `origin/<prod>`, push forzado de dev, restart dev) | idem |
| `deploying_prod` | `git pull --ff-only` + `git merge --ff-only dev` (rama local, mismo repo) + push + install + build + pm2 restart prod OK | `done` | worker |
| `deploying_prod` | falla (por ejemplo prod avanzó y ff no es posible) | `failed` | worker |

Si el worker arranca y encuentra un job en un estado en curso (`running`, `verifying`, `deploying_dev`,
`deploying_prod`), significa que se reinició a mitad de un cambio: lo marca `failed` con un mensaje
claro y limpia el worktree. No se intenta reanudar una sesión de Claude ni un despliegue a medias.
Por eso no hay que cambiar `AGENT_PROD_BRANCH` ni reiniciar `natura-agent` con un cambio abierto.

Al pasar a `failed` el worker deja el worktree dev limpio (`git reset --hard origin/<prod>`, `git clean -fd`)
para que el siguiente job arranque de cero. Un job `failed` no acepta acciones.

La web solo escribe: el job inicial (`queued`) y el campo `action` cuando `status === "preview"`
y `action === null`. Todo lo demás lo escribe el worker. Si la web encuentra un job abierto,
`POST /api/admin/jobs` responde `409` con `{ error, job }`.

## Corrida de Claude (worker)

Comando de la ronda inicial, ejecutado con `cwd = <AGENT_DEV_DIR>/web`:

```
claude -p "<prompt de la ronda>" \
  --output-format json \
  --model "$AGENT_CLAUDE_MODEL" \
  --tools Read,Glob,Grep,Edit,Write \
  --allowedTools Read,Glob,Grep,Edit,Write \
  --permission-mode dontAsk \
  --settings <AGENT_DATA_DIR>/claude-settings.json \
  --append-system-prompt "<reglas>"
```

Rondas `feedback` y `autofix` añaden `--resume <sessionId de la última ronda>`.
Antes de invocar, el worker comprueba con `claude --help` si existe `--max-turns`; si existe lo pasa
con valor 40. Siempre aplica `AGENT_CLAUDE_TIMEOUT_MS` matando el proceso al vencer.

`claude-settings.json` lo genera el worker al arrancar (idempotente) y contiene solo el hook:

```json
{
  "hooks": {
    "PreToolUse": [
      { "matcher": "Edit|Write|MultiEdit",
        "hooks": [ { "type": "command", "command": "node <ruta absoluta>/agent/hooks/allowlist-guard.mjs" } ] }
    ]
  }
}
```

El hook lee el JSON del evento por stdin (`tool_input.file_path`), resuelve la ruta relativa a
`<AGENT_DEV_DIR>/web` y sale con código 2 y un mensaje en stderr si no está en la allowlist.

Salida esperada de `--output-format json`: objeto con `type: "result"`, `subtype`, `is_error`,
`result` (texto), `session_id`, `num_turns`, `total_cost_usd`. Guardar el JSON crudo en
`logs/<id>/claude-<n>.json`.

Reglas del `--append-system-prompt` (el texto exacto vive en `agent/lib/prompt.mjs`):

- solo puede editar los archivos de la allowlist; cualquier otro archivo está prohibido;
- no puede crear archivos, borrar archivos, instalar dependencias ni cambiar configuración;
- mantiene la identidad visual y la estructura de datos (`SiteContent` en `src/data/types.ts`);
- si el cambio pide algo fuera del alcance, no lo hace y lo explica en su respuesta final;
- termina con un resumen de dos líneas de lo que cambió.

## Prompt del chat (web) y tool calling

El chat de `/admin` usa la API de Claude (`@anthropic-ai/sdk`, modelo `ANTHROPIC_MODEL`, por defecto
`claude-opus-5`) con `ANTHROPIC_API_KEY` leída en el servidor. Esa key es solo del chat: el worker la
elimina del entorno antes de lanzar `claude -p`, que sigue usando el login de claude.ai del operador.
Se añade una tool:

```json
{
  "name": "submit_change_request",
  "description": "Enviar una solicitud de cambio de texto o estructura de la landing al ejecutor, una vez entendida y validada con el usuario.",
  "strict": true,
  "input_schema": {
    "type": "object",
    "properties": {
      "summary":     { "type": "string", "description": "Una línea para el historial, máximo 140 caracteres." },
      "instruction": { "type": "string", "description": "Instrucción completa y autocontenida para el agente de código: qué archivos tocar, qué texto cambiar, en qué idioma(s), y qué no tocar." }
    },
    "required": ["summary", "instruction"],
    "additionalProperties": false
  }
}
```

Cuando la respuesta trae un bloque `tool_use` con ese nombre, el endpoint responde
`{ message, proposal: { summary, instruction } }` y la UI muestra la propuesta con el botón
"Confirmar y ejecutar" (confirmación 1). No se envía `tool_result` de vuelta: la propuesta
se cierra en la UI. El endpoint inyecta en el `system` una línea con el estado actual
(`Sin cambios abiertos.` o `Cambio abierto <id> en estado <status>: <summary>`) para que el modelo
no proponga un segundo cambio mientras hay uno abierto.

## Endpoints (todos requieren sesión válida; los POST además exigen mismo origen)

Las rutas llevan barra final por `trailingSlash: 'always'` en `astro.config.mjs`. Los GET no comprueban
`Origin` porque el navegador no lo envía en peticiones GET del mismo origen; la cookie `SameSite=Strict` cubre ese caso.

| Método y ruta | Cuerpo | Respuesta |
|---|---|---|
| `POST /api/admin/jobs/` | `{ summary, instruction }` | `201 { job }` · `409 { error, job }` si hay abierto · `400` si inválido |
| `GET /api/admin/jobs/` | — | `{ jobs: [...] }` los últimos 50, más recientes primero |
| `GET /api/admin/jobs/:id/` | — | `{ job }` · `404` |
| `POST /api/admin/jobs/:id/action/` | `{ type: "approve" \| "discard" \| "feedback", instruction? }` | `200 { job }` · `409` si el estado no es `preview` o ya hay action pendiente · `400` |

Validación: `summary` 1..140 chars, `instruction` 1..6000 chars, `feedback.instruction` 1..4000.

## UI de `/admin`

- Tarjeta de propuesta (tras el tool call) con resumen, instrucción completa desplegable, botón
  "Confirmar y ejecutar" y "Descartar propuesta".
- Panel del cambio abierto: estado actual con etiqueta legible, línea de tiempo (`log`), enlace
  a la URL de dev cuando exista, `diffStat`, y en `preview` los botones "Publicar en producción",
  "Pedir ajustes" (con textarea) y "Descartar".
- Observador: mientras haya un job no terminal, polling a `GET /api/admin/jobs/:id` cada 3 s.
  Un fallo de red durante el polling (el proceso `natura` se reinicia al publicar) no es error:
  se reintenta en silencio hasta 60 s antes de mostrar aviso.
- Historial de cambios: tabla con fecha, resumen, estado, commit en dev (7 chars), commit en prod
  (7 chars), archivos tocados. Fuente: `GET /api/admin/jobs`.

## Banner de desarrollo

`src/layouts/BaseLayout.astro` muestra una franja fija roja arriba de todo cuando
`process.env.DEPLOY_ENV === 'dev'` (leído en tiempo de request, no de build). Texto en español
y en inglés según `lang`: "Versión de desarrollo. Estos cambios todavía no están publicados." /
"Development version. These changes are not published yet." El proceso pm2 `natura-dev` define
`DEPLOY_ENV=dev`; `natura` no lo define, así que el banner nunca aparece en producción aunque el
código sea el mismo en ambas ramas.

## Procesos pm2 y despliegue

| App | cwd | script | env |
|---|---|---|---|
| `natura` | `~/code/natura2030/web` | `dist/server/entry.mjs` | `PORT=3001` |
| `natura-dev` | `~/code/natura2030-dev/web` | `dist/server/entry.mjs` | `PORT=3002`, `DEPLOY_ENV=dev` |
| `natura-agent` | `~/code/natura2030/web` | `agent/worker.mjs` | `AGENT_*` según tabla |

El worktree se crea con `git worktree add ~/code/natura2030-dev dev` desde `~/code/natura2030`.
Tiene su propio `web/node_modules` y su propio `web/.env` (copia del de prod con `PORT=3002`
y `DEPLOY_ENV=dev`). nginx expone `dev.natura.2-25-153-144.sslip.io` → `127.0.0.1:3002`.

Commits del worker: autor `NATURA Agent <agent@natura2030.local>`, mensaje
`[agent] <summary>` con cuerpo `Job: <id>` y la instrucción. En `deploying_prod` el merge es
`--ff-only`, por lo que el commit de dev pasa tal cual a prod y el historial muestra el mismo sha.
