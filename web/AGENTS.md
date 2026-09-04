# Guía para agentes — NATURA 2030 web

Contexto operativo para cualquier agente (Claude Code u otro) que trabaje en este repo. Para la descripción del proyecto, stack y estructura, ver primero **[README.md](./README.md)** — esta guía asume que ya la leíste y se enfoca en convenciones y errores ya encontrados que no son obvios a simple vista.

> **No hagas commits.** El usuario hace todos los commits de este repo manualmente. No corras `git commit` (ni `git add` pensando en commitear, ni `git push`) salvo que el usuario lo pida explícitamente en ese mismo turno — dejá los cambios en el working tree sin commitear cuando termines una tarea.

## Lo más importante antes de tocar código

El sitio usa una sola identidad visual, ubicada en `src/themes/v1-nature-distilled/`. Antes de editar algo, ubicate:

- ¿Es un **hecho** sobre NATURA 2030 (un paso del proceso, un tipo de dato, un entregable)? → va en `src/data/content.es.ts` / `content.en.ts`, **nunca** dentro del theme.
- ¿Es **tono/voz** (titular del hero, eyebrow, label del nav)? → va en `src/themes/v1-nature-distilled/copy.ts`.
- ¿Es **visual** (color, tipografía, layout, animación)? → va en `tokens.css` o `Page.astro`.

## Gotchas de CSS ya encontrados en esta sesión

**1. `overflow-x: hidden` fuera de `<html>` rompe `position: sticky`.**
Poner `overflow-x` (sin `overflow-y`) en cualquier elemento que no sea `<html>` hace que el navegador le calcule `overflow-y: auto` automáticamente, convirtiéndolo en su propio scroll container — y eso desconecta a sus descendientes `position: sticky` del scroll real de la ventana. La regla vive **solo** en `html` (`src/layouts/BaseLayout.astro`, estilo global). No la agregues en `body` ni en el `<div class="theme-v1">` raíz.

**2. Especificidad: la regla genérica de enlaces le gana al color del botón.**
Cada tema tiene `.theme-vN a { color: var(--ink); }` para los links de texto normales. Un botón (`.nd-btn-primary`, `.dv-btn-primary`, `.co-btn-primary`) con un `color` distinto tiene *menos* especificidad que esa regla (`.theme-vN a` = clase+tipo vs. una sola clase del botón), así que pierde — el texto del botón queda invisible o con el color equivocado. El patrón usado para evitarlo: excluir los botones de la regla genérica con `:not()`:
```css
.theme-v1 a:not(.nd-btn) { color: var(--ink); }
```
y asegurar `text-decoration: none` en la clase base del botón (`.nd-btn`), ya que se excluyó de la regla que antes se lo daba gratis.

**3. Verificar animaciones/scroll-reveal con capturas de página completa engaña.**
Los `.reveal` (fade-in al entrar en viewport) usan `IntersectionObserver`. Un `take_screenshot` con `fullPage: true` no simula scroll real — el observer solo disparó para lo que ya cruzó el viewport chico original, así que contenido más abajo aparece "vacío" en la captura sin serlo para un usuario real. Para verificar: navegar, hacer scroll real con `evaluate_script` (`window.scrollTo` / `scrollBy`) y capturar el viewport en cada punto, no la página entera de una sola vez.

## Convenciones de contenido

- `src/data/types.ts` — el contrato (`SiteContent`) de todo el copy compartido entre idiomas.
- `src/data/content.es.ts` / `content.en.ts` — los hechos. Único lugar a editar el contenido factual para ambos idiomas.
- `src/themes/v1-nature-distilled/copy.ts` — voz del sitio. El titular del hero usa una micro-sintaxis parseada por `src/utils/headline.ts`:
  - `{{frase}}` → se pinta con el color de acento.
  - `\n` → salto de línea.
  - Ejemplo: `"Datos climáticos dispersos.\nUna {{sola fuente}} de verdad."`
- Agregar un idioma nuevo: sumar el locale a `Locale` en `data/types.ts`, crear `content.<locale>.ts` y su carpeta en `pages/<locale>/`.

## Rutas

Los archivos de `src/pages/` deben limitarse a componer el layout y la feature correspondiente. La portada vive en `themes/v1-nature-distilled/`; el mapa y el laboratorio viven en `features/platform/` y `features/models/`.

## Entorno de pnpm

`pnpm-workspace.yaml` existe únicamente para poder declarar `allowBuilds` (permite que `esbuild`/`sharp` corran sus scripts de instalación) y requiere un campo `packages` (`["."]`) o `pnpm install` falla con `packages field missing or empty`. Por ser técnicamente un "workspace", instalar paquetes nuevos requiere el flag `-w`:
```sh
pnpm add -w <paquete>
pnpm add -w -D <paquete>
```

## Verificación antes de dar un cambio por terminado

```sh
pnpm check   # astro check — debe dar 0 errores/warnings
pnpm build   # build de producción para Vercel, sin errores
```

Para verificación visual: `pnpm dev` (puerto 4321) + chrome-devtools MCP. El perfil de Chrome del MCP es compartido entre sesiones de este usuario en esta máquina — si otra sesión lo tiene abierto, `list_pages`/`navigate_page` fallan con "browser already running for ... Use --isolated". No es un error propio del sitio; esperá a que se libere o avisá al usuario en vez de forzar una segunda instancia.

Para dejar el dev server corriendo en background en vez de en foreground: `astro dev --background` (parar con `astro dev stop`, ver estado con `astro dev status`, logs con `astro dev logs`).

## Qué no hacer sin que el usuario lo pida explícitamente

- **Hacer commits o push.** El usuario los hace a mano — ver nota al inicio del documento.
- Cambiar el stack o introducir otro framework de i18n sin un pedido explícito.

## Documentación de Astro

- [Rutas y páginas](https://docs.astro.build/en/guides/routing/)
- [Componentes Astro](https://docs.astro.build/en/basics/astro-components/)
- [Content Collections](https://docs.astro.build/en/guides/content-collections/) (no se usan en este proyecto — el contenido es TS plano, ver arriba por qué)
- [Estilos](https://docs.astro.build/en/guides/styling/)
- [Internacionalización](https://docs.astro.build/en/guides/internationalization/) (no se usa el router de i18n built-in de Astro; las rutas `/` y `/en/` son archivos de página explícitos)
