# NATURA 2030 — sitio web

Landing page de **NATURA 2030**, la plataforma de información climática costera de **Adaptation Latin America (ALA)**

## Stack

- **[Astro](https://astro.build)** con adaptador de Vercel + **pnpm**. React se usa solo en las interfaces interactivas del laboratorio y `/admin/`; no se usa Tailwind.
- **TypeScript** estricto (`astro check` da 0 errores/warnings).
- **[@fontsource](https://fontsource.org/)** para self-host de Archivo (en vez de cargar Google Fonts por CDN).
- **astro:assets + sharp** para optimizar el isotipo de marca.
- **@astrojs/sitemap** para SEO básico.

## Requisitos y comandos

```sh
pnpm install       # instalar dependencias
pnpm dev           # localhost:4321
pnpm build         # build de producción para Vercel
pnpm preview       # previsualizar el build
pnpm check         # astro check — type-check del proyecto
```

## Rutas

| Ruta | Versión | Idioma |
|---|---|---|
| `/` | Nature Distilled | Español (default) |
| `/en/` | Nature Distilled | Inglés |
| `/platform/` · `/platform/en/` | Mapa de iniciativas | ES · EN |
| `/models/` · `/models/en/` | Laboratorio de modelos | ES · EN |
| `/admin/` | Centro de edición asistida | Acceso privado |

El sitio conserva una sola dirección visual y ofrece un toggle de modo oscuro cuya preferencia se guarda en `localStorage`.

## Centro de edición asistida

`/admin/` ofrece un login y un chat privado para preparar y aplicar cambios de contenido de la
landing. En Vercel funciona en **modo propuesta**: analiza solicitudes y archivos con la API de
OpenAI, pero no modifica el repositorio ni despliega cambios. En la VPS, en cambio, el chat
puede *ejecutar* el cambio: tras una primera confirmación crea un job que un worker aplica en
una rama `dev` separada (con Claude, sin acceso a shell, restringido a una allowlist fija de
archivos de texto/estructura), lo verifica con `pnpm check`/`pnpm build`, lo publica en una
preview (`natura-dev`, con banner de "no publicado") y, solo tras una segunda confirmación, lo
promueve a producción con un commit `[agent]`. Puntos del mapa y modelos no están cubiertos
todavía por este ejecutor.

Para configurarlo localmente, copia `.env.example` a `.env` y define `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `SESSION_SECRET`, `ANTHROPIC_API_KEY` y, opcionalmente, `ANTHROPIC_MODEL` (por defecto `claude-opus-5`). En Vercel, configura los mismos secretos como variables de entorno; nunca uses el prefijo `PUBLIC_` para la API key. Las variables `DEPLOY_ENV` y `AGENT_*` (worker de la VPS) están documentadas en `.env.example` pero solo aplican al despliegue self-hosted — ver [`DEPLOY.md`](./DEPLOY.md).

El contrato completo del ejecutor (esquema de job, máquina de estados, allowlist, endpoints) vive en [`docs/AGENT_CONTRACT.md`](./docs/AGENT_CONTRACT.md); el resumen operativo y de seguridad está en [`docs/ADMIN_AGENT.md`](./docs/ADMIN_AGENT.md).

## Dirección visual

**v1 · Nature Distilled** — editorial cálido. Fondo crema `#FBF7EF`, navy `#122847`, acentos teal/amarillo. Tipografía Archivo + Arial. El titular del hero aparece palabra por palabra. Pensado para público general y donantes.

## Internacionalización

- Español (default, sin prefijo) e inglés (`/en`).
- **Todo el copy factual** (proceso, tipos de dato, entregables, aplicaciones, "quiénes somos", footer) vive en un único lugar por idioma: `src/data/content.es.ts` y `content.en.ts`.
- El copy **de voz** (titular del hero, eyebrows y labels del nav) vive en `src/themes/v1-nature-distilled/copy.ts`.

## Estructura del proyecto

```
src/
├── data/                     # hechos compartidos (única fuente de verdad, es/en)
├── utils/                    # parser de titulares con acento
├── features/                 # mapa y laboratorio de modelos
├── layouts/BaseLayout.astro  # <html>, fuentes, dark mode
├── components/shared/        # ThemeToggle, LanguageSwitcher, ContactEmail
├── scripts/                  # interacciones compartidas (scroll, reveal, magnetic buttons)
├── themes/
│   └── v1-nature-distilled/  # tokens.css + copy.ts + Page.astro
├── assets/brand/             # isotipo (color/blanco/negro), sacado del manual de marca
└── pages/                    # rutas — cada archivo son ~3 líneas
```

Para el detalle de por qué está organizado así (y las convenciones a seguir al editarlo), ver **[AGENTS.md](./AGENTS.md)**.

## Editar contenido

| Quiero cambiar... | Edito... |
|---|---|
| Un dato (proceso, tipos de entrada, entregables, aplicaciones, "nosotros", footer) | `src/data/content.es.ts` **y** `content.en.ts` |
| El titular/tono de la portada | `src/themes/v1-nature-distilled/copy.ts` |
| Colores o tipografía de la portada | `src/themes/v1-nature-distilled/tokens.css` |
| Mapa o modelos | `src/features/platform/` · `src/features/models/` |
