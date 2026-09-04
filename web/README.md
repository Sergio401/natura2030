# NATURA 2030 — sitio web

Landing page de **NATURA 2030**, la plataforma de información climática costera de **Adaptation Latin America (ALA)**

## Stack

- **[Astro](https://astro.build)** (`output: 'static'`) + **pnpm**. Sin React/Vue/Svelte, sin Tailwind; el CSS es scoped y usa variables de diseño.
- **TypeScript** estricto (`astro check` da 0 errores/warnings).
- **[@fontsource](https://fontsource.org/)** para self-host de Archivo (en vez de cargar Google Fonts por CDN).
- **astro:assets + sharp** para optimizar el isotipo de marca.
- **@astrojs/sitemap** para SEO básico.

## Requisitos y comandos

```sh
pnpm install       # instalar dependencias
pnpm dev           # localhost:4321
pnpm build         # build estático a ./dist
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

El sitio conserva una sola dirección visual y ofrece un toggle de modo oscuro cuya preferencia se guarda en `localStorage`.

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
