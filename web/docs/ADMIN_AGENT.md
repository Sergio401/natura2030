# Agente administrador de NATURA 2030

## Estado actual: ejecutor de texto/estructura en la VPS

La ruta `/admin/` ya no es solo un prototipo de propuestas: en la VPS ejecuta cambios de
verdad a través de un pipeline dev → prod. La especificación completa (máquina de estados,
esquema de job, allowlist, prompt exacto, endpoints) vive en
[`AGENT_CONTRACT.md`](./AGENT_CONTRACT.md) — este documento es el resumen orientado a
operación y a los límites de seguridad; ante cualquier discrepancia gana el contrato.

Resumen del flujo: el chat de `/admin/` (OpenAI, Responses API) entiende la solicitud y, tras
una primera confirmación del usuario, crea un *job*. El worker (`agent/worker.mjs`, proceso
pm2 `natura-agent` corriendo como el usuario `sergio`) lo toma, invoca `claude -p` **sin
shell** sobre un worktree separado (rama `dev`), verifica (`pnpm check` + `pnpm build`),
despliega ese worktree en `natura-dev` para previsualizar, y solo tras una segunda
confirmación (`approve`) hace merge `--ff-only` a la rama de producción, reconstruye y reinicia
`natura`. Cada paso queda en `~/natura-agent/jobs/<id>.json` y en `logs/<id>/`.

Piezas que ya existen:

- login con credenciales configuradas por variables de entorno;
- sesión firmada, `HttpOnly`, `SameSite=Strict` y con expiración de ocho horas;
- chat conectado a la Responses API mediante una API key exclusivamente del lado servidor;
- carga controlada de imágenes, PDF, Word, Excel, CSV, JSON, GeoJSON y texto;
- una tool `submit_change_request` que convierte una solicitud entendida en una propuesta con
  resumen e instrucción, mostrada en la UI antes de cualquier ejecución (confirmación 1);
- un worker (`agent/worker.mjs`) que aplica el cambio en un worktree `dev` aislado, con Claude
  restringido a `Read,Glob,Grep,Edit,Write` (sin Bash) y un hook `PreToolUse` que rechaza
  cualquier ruta fuera de la allowlist de `agent/lib/allowlist.mjs`;
- verificación determinista (`pnpm check`, `pnpm build`) y un chequeo posterior de
  `git status --porcelain` contra la misma allowlist antes de aceptar el resultado;
- preview pública en `natura-dev` con banner rojo de "versión de desarrollo" (ver
  `AGENT_CONTRACT.md`), y una segunda confirmación explícita antes de tocar producción;
- historial auditable: cada job queda en `~/natura-agent/jobs/<id>.json`, sus logs en
  `~/natura-agent/logs/<id>/`, y cada cambio publicado es un commit `[agent] <resumen>`
  firmado por `NATURA Agent <agent@natura2030.local>`.

## Operaciones permitidas hoy

Solo texto y estructura de la landing existente, vía la allowlist fija del contrato:

- `src/data/content.es.ts` / `content.en.ts` (copy factual, ambos idiomas);
- `src/data/platform-copy.ts`, `src/data/models-copy.ts`;
- `src/themes/v1-nature-distilled/copy.ts`, `tokens.css`, `Page.astro`.

Cualquier ruta fuera de esa lista es rechazada dos veces: por el hook `PreToolUse` mientras
Claude edita, y por el chequeo de `git status` del worker después de la corrida. Un intento
fuera de la allowlist termina el job en `failed`, nunca en `preview` ni `done`.

## Operaciones futuras (no implementadas)

Quedan fuera del ejecutor actual y requieren su propio diseño de validación antes de
habilitarse:

1. **Puntos del mapa** (`add_map_location`): agregar una entrada a
   `src/data/platform-locations.ts` con activos asociados — necesita esquema estricto de
   coordenadas/activos, no solo texto libre.
2. **Modelos** (`add_model`): registrar un modelo en `src/features/models/models/` y
   `registry.ts` — implica ejecutar o al menos cargar código/datos aportados por el cliente,
   lo que necesita un sandbox real, separado del worker de texto.

Mientras no existan, el chat de `/admin/` debe seguir explicando que esas operaciones no están
disponibles en vez de intentar forzarlas por la ruta de texto.

## Controles de seguridad vigentes

- **Un solo cambio abierto a la vez**: `POST /api/admin/jobs` responde `409` si ya hay un job
  no terminal, así que no hay dos ejecuciones de Claude escribiendo sobre el mismo worktree.
- **Claude corre sin shell**: el worker invoca `claude -p` con `--tools Read,Glob,Grep,Edit,Write`
  y `--allowedTools` igual; no hay `Bash` ni acceso a red disponible para el modelo. Verificación,
  build, git y pm2 los ejecuta el worker de forma determinista, nunca Claude.
- **Allowlist de archivos aplicada dos veces**: hook `PreToolUse` (bloquea en el momento) y
  `git status --porcelain` posterior (red de seguridad si el hook fallara).
- **Dos confirmaciones humanas**: crear el job (confirmación 1) y aprobar `preview → prod`
  (confirmación 2) son acciones separadas y explícitas del usuario autenticado en `/admin/`.
- **Preview antes de producción**: todo cambio se ve primero en `natura-dev` (banner rojo) y
  solo pasa a `natura` con un `git merge --ff-only`, que falla limpio si producción avanzó
  mientras tanto en vez de forzar un merge inesperado.
- **Traza de auditoría**: job JSON completo (instrucción, rondas, resultado de Claude, diff,
  commits) + logs crudos de cada paso + los commits `[agent]` mismos en el historial de git.
- **Nadie más hace commits**: solo el worker, y solo con prefijo `[agent]` — ver
  `AGENT_CONTRACT.md`.

## Limitaciones y controles pendientes

- **Una sola contraseña compartida** para `/admin/`: suficiente para el operador único actual,
  no para multiusuario. Antes de sumar operadores hace falta autenticación por persona (SSO o
  usuarios separados), MFA y rotación/recuperación de acceso.
- **Rate limiting solo en memoria**: no persiste entre reinicios ni escala a más de un proceso.
- **Sin sandbox de ejecución de código de terceros**: el worker actual solo edita archivos de
  texto; el día que se habilite `add_model` (código/datos del cliente), ese código no puede
  correr en este mismo proceso ni en el host de producción — necesita un sandbox efímero
  separado, con red restringida y sin acceso a secretos.
- **Backups y rollback**: hoy el único rollback es git (`git revert` del commit `[agent]` en
  `main`/`chatbot` + redeploy manual); no hay snapshot de release ni health check automático
  antes de servir el nuevo build.
- **Límites de gasto/tokens**: `AGENT_CLAUDE_TIMEOUT_MS` y `AGENT_MAX_FIX_ROUNDS` acotan tiempo
  de ejecución, pero no hay un tope de costo mensual ni alertas si el uso de la API se dispara.
- **Prompt injection vía contenido cargado**: el chat de `/admin/` acepta adjuntos (PDF, Word,
  CSV, etc.); no hay pruebas sistemáticas de instrucciones ocultas dentro de esos archivos
  influyendo en la instrucción que termina llegando a Claude.

Un prompt restrictivo por sí solo nunca fue ni es suficiente: las acciones reales están
limitadas por la allowlist en código, la ausencia de Bash, las verificaciones deterministas del
worker y las dos confirmaciones humanas — no por buena voluntad del modelo.
