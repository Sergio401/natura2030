# Guía para agentes — NATURA 2030 web

Contexto operativo para cualquier agente (Claude Code u otro) que trabaje en este repo. Para la descripción del proyecto, stack y estructura, ver primero **[README.md](./README.md)** — esta guía asume que ya la leíste y se enfoca en convenciones y errores ya encontrados que no son obvios a simple vista.

> **No hagas commits.** El usuario hace todos los commits de este repo manualmente. No corras `git commit` (ni `git add` pensando en commitear, ni `git push`) salvo que el usuario lo pida explícitamente en ese mismo turno — dejá los cambios en el working tree sin commitear cuando termines una tarea.

## Lo más importante antes de tocar código

Este NO es un sitio con una sola identidad visual: son **3 skins independientes** (`src/themes/v1-*`, `v2-*`, `v3-*`) que comparten datos y conviven en el mismo repo. Antes de editar algo, ubicate:

- ¿Es un **hecho** sobre NATURA 2030 (un paso del proceso, un tipo de dato, un entregable)? → va en `src/data/content.es.ts` / `content.en.ts`, **nunca** dentro de un theme — si lo pones en un theme, vas a desincronizar las 3 versiones.
- ¿Es **tono/voz** de una versión específica (titular del hero, eyebrow, label del nav)? → va en `src/themes/<version>/copy.ts`.
- ¿Es **visual** (color, tipografía, layout, animación)? → va en `tokens.css` o `Page.astro` de esa versión únicamente. No hace falta —ni conviene— replicarlo en las otras dos si es una decisión de estilo intencional.

Las 3 direcciones visuales son **propuestas exploratorias sin aprobar** por el cliente (ver README). No elijas una y borres las otras, no las fusiones, y no cambies el stack (Astro/pnpm, sin Tailwind/React) salvo pedido explícito del usuario.

## Gotchas de CSS ya encontrados en esta sesión

**1. `overflow-x: hidden` fuera de `<html>` rompe `position: sticky`.**
Poner `overflow-x` (sin `overflow-y`) en cualquier elemento que no sea `<html>` hace que el navegador le calcule `overflow-y: auto` automáticamente, convirtiéndolo en su propio scroll container — y eso desconecta a sus descendientes `position: sticky` del scroll real de la ventana (el nav pegajoso o, en v3, el panel de anillos del scrollytelling dejan de pegarse y simplemente scrollean con la página). La regla vive **solo** en `html` (`src/layouts/BaseLayout.astro`, estilo global). No la agregues en `body` (mismo problema, un nivel más arriba) ni en el `<div class="theme-vN">` raíz de cada tema.

**2. Especificidad: la regla genérica de enlaces le gana al color del botón.**
Cada tema tiene `.theme-vN a { color: var(--ink); }` para los links de texto normales. Un botón (`.nd-btn-primary`, `.dv-btn-primary`, `.co-btn-primary`) con un `color` distinto tiene *menos* especificidad que esa regla (`.theme-vN a` = clase+tipo vs. una sola clase del botón), así que pierde — el texto del botón queda invisible o con el color equivocado. El patrón usado para evitarlo: excluir los botones de la regla genérica con `:not()`:
```css
.theme-v3 a:not(.co-btn) { color: var(--ink); }
```
y asegurar `text-decoration: none` en la clase base del botón (`.co-btn`, `.nd-btn`, `.dv-btn`), ya que se excluyó de la regla que antes se lo daba gratis. Si agregás un botón o link nuevo con color propio, seguí este mismo patrón — y revisalo en **las 3 versiones**, porque el CSS se copia entre ellas y el bug es fácil de reintroducir.

**3. Verificar animaciones/scroll-reveal con capturas de página completa engaña.**
Los `.reveal` (fade-in al entrar en viewport) usan `IntersectionObserver`. Un `take_screenshot` con `fullPage: true` no simula scroll real — el observer solo disparó para lo que ya cruzó el viewport chico original, así que contenido más abajo aparece "vacío" en la captura sin serlo para un usuario real. Para verificar: navegar, hacer scroll real con `evaluate_script` (`window.scrollTo` / `scrollBy`) y capturar el viewport en cada punto, no la página entera de una sola vez.

## Convenciones de contenido

- `src/data/types.ts` — el contrato (`SiteContent`) de todo el copy compartido entre versiones e idiomas.
- `src/data/content.es.ts` / `content.en.ts` — los hechos. Único lugar a editar para que el cambio se refleje en `/v1`, `/v2`, `/v3` y ambos idiomas.
- `src/themes/<version>/copy.ts` — voz propia de cada versión. El titular del hero usa una micro-sintaxis parseada por `src/utils/headline.ts`:
  - `{{frase}}` → se pinta con el color de acento.
  - `\n` → salto de línea.
  - Ejemplo: `"Datos climáticos dispersos.\nUna {{sola fuente}} de verdad."`
- Agregar un idioma nuevo: sumar el locale a `Locale` en `data/types.ts`, crear `content.<locale>.ts`, y las carpetas `pages/vN/<locale>/`.
- Agregar una versión nueva (v4...): duplicar la forma de `src/themes/v1-nature-distilled/` (tokens.css + copy.ts + Page.astro), sumarla a `Version` en `src/utils/routes.ts`, a `ui.versionNames` en `data/content.*.ts`, y crear `pages/v4/(en/)index.astro`.

## Rutas

Un archivo de página (`src/pages/vN[/en]/index.astro`) son ~3 líneas: importa `BaseLayout`, importa el `Page.astro` del tema correspondiente, le pasa `locale`. Si estás por escribir markup dentro de `src/pages/`, probablemente estás en el lugar equivocado — va en el `Page.astro` del theme.

## Entorno de pnpm

`pnpm-workspace.yaml` existe únicamente para poder declarar `allowBuilds` (permite que `esbuild`/`sharp` corran sus scripts de instalación) y requiere un campo `packages` (`["."]`) o `pnpm install` falla con `packages field missing or empty`. Por ser técnicamente un "workspace", instalar paquetes nuevos requiere el flag `-w`:
```sh
pnpm add -w <paquete>
pnpm add -w -D <paquete>
```

## Verificación antes de dar un cambio por terminado

```sh
pnpm check   # astro check — debe dar 0 errores/warnings
pnpm build   # build estático de las 7 páginas, sin errores
```

Para verificación visual: `pnpm dev` (puerto 4321) + chrome-devtools MCP. El perfil de Chrome del MCP es compartido entre sesiones de este usuario en esta máquina — si otra sesión lo tiene abierto, `list_pages`/`navigate_page` fallan con "browser already running for ... Use --isolated". No es un error propio del sitio; esperá a que se libere o avisá al usuario en vez de forzar una segunda instancia.

Para dejar el dev server corriendo en background en vez de en foreground: `astro dev --background` (parar con `astro dev stop`, ver estado con `astro dev status`, logs con `astro dev logs`).

## Qué no hacer sin que el usuario lo pida explícitamente

- **Hacer commits o push.** El usuario los hace a mano — ver nota al inicio del documento.
- Elegir una sola versión visual y borrar/archivar las otras dos.
- Cambiar el stack (meter Tailwind, React/Vue, un framework de i18n) — fue una decisión explícita documentada en el README.

## Documentación de Astro

- [Rutas y páginas](https://docs.astro.build/en/guides/routing/)
- [Componentes Astro](https://docs.astro.build/en/basics/astro-components/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/) (no se usan en este proyecto — el contenido es TS plano, ver arriba por qué)
- [Estilos](https://docs.astro.build/en/guides/styling/)
- [Internacionalización](https://docs.astro.build/en/guides/internationalization/) (tampoco se usa el router de i18n built-in de Astro — el ruteo `/vN[/en]` es manual, ver `src/utils/routes.ts`)
