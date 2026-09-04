// Prompt builders for the change executor. See docs/AGENT_CONTRACT.md
// ("Reglas del --append-system-prompt") for the exact rules this must convey.
// Kept in Spanish because the site's admin and the model's final `result`
// text are both Spanish-facing.

/**
 * The fixed rules appended to every `claude -p` invocation via
 * --append-system-prompt. Includes the allowlist verbatim so the model never
 * has to guess it, and reminds it that it has no shell.
 * @param {string[]} allowedFiles  ALLOWED_FILES from agent/lib/allowlist.mjs.
 */
export function buildRulesPrompt(allowedFiles) {
  const list = allowedFiles.map((file) => `  - ${file}`).join('\n');
  return `Sos el agente de código que ejecuta cambios de contenido en el sitio NATURA 2030.

Reglas fijas, sin excepción:

1. Solo podés editar estos archivos (rutas relativas a la carpeta actual):
${list}
   Cualquier otro archivo está prohibido. Un hook técnico bloqueará y rechazará cualquier
   intento de Edit o Write fuera de esta lista, así que ni lo intentes.
2. No podés crear archivos nuevos, ni borrar archivos, ni instalar dependencias, ni cambiar
   configuración (package.json, tsconfig, astro.config, etc.). Ninguno de esos archivos está
   en la lista de arriba.
3. No tenés acceso a una terminal ni a Bash. No intentes correr pnpm, git, ni ningún comando:
   la verificación (pnpm check, pnpm build), el commit y el despliegue los hace otro proceso
   de forma determinista después de que termines de editar.
4. Mantené la identidad visual y la estructura de datos existentes. En particular respetá el
   tipo SiteContent definido en src/data/types.ts: no cambies la forma de los objetos de
   contenido, solo sus valores de texto (a menos que la instrucción pida explícitamente algo
   estructural que siga siendo válido para ese tipo).
5. Si el cambio pedido requiere tocar un archivo fuera de la lista, o pide algo fuera de tu
   alcance (código de otras páginas, lógica de la app, dependencias, etc.), no lo hagas: explicá
   en tu respuesta final qué parte no podés hacer y por qué.
6. Terminá siempre tu respuesta con un resumen de dos líneas de lo que cambiaste (o de por qué
   no pudiste hacer el cambio, si fue el caso).`;
}

/**
 * Initial round prompt: the job's full instruction, framed with a short
 * reminder of what "done" looks like.
 * @param {{summary: string, instruction: string}} job
 */
export function buildInitialPrompt(job) {
  return `Resumen del cambio: ${job.summary}

Instrucción completa:
${job.instruction}

Hacé el cambio editando únicamente los archivos permitidos. Cuando termines, resumí en dos
líneas qué cambiaste.`;
}

/**
 * Feedback round prompt: sent with --resume so Claude has the prior session's
 * context. `feedbackText` is the admin's follow-up instruction.
 * @param {{summary: string, instruction: string}} job
 * @param {string} feedbackText
 */
export function buildFeedbackPrompt(job, feedbackText) {
  return `El cliente vio la vista previa del cambio anterior ("${job.summary}") y pidió este ajuste:

${feedbackText}

Aplicá el ajuste sobre lo que ya hiciste, editando únicamente los archivos permitidos. Cuando
termines, resumí en dos líneas qué cambiaste esta vez.`;
}

/**
 * Autofix round prompt: sent with --resume after `pnpm check` or `pnpm build`
 * failed in the dev worktree. `checkOrBuildErrorTail` is the last ~40 lines of
 * the failing log.
 * @param {{summary: string}} job
 * @param {string} checkOrBuildErrorTail
 */
export function buildAutofixPrompt(job, checkOrBuildErrorTail) {
  return `Tu cambio anterior para "${job.summary}" no pasó la verificación automática (pnpm check
o pnpm build). Este es el final del log de error:

\`\`\`
${checkOrBuildErrorTail}
\`\`\`

Corregí el problema editando únicamente los archivos permitidos, sin cambiar nada que no esté
relacionado con este error. No podés correr comandos vos mismo: solo editá el código. Cuando
termines, resumí en dos líneas qué corregiste.`;
}
