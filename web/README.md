# NATURA 2030 — sitio web

Landing page de **NATURA 2030**, la plataforma de información climática costera de **Adaptation Latin America (ALA)**

## Stack

- **[Astro](https://astro.build)** (`output: 'static'`) + **pnpm**. Sin React/Vue/Svelte, sin Tailwind — cada versión trae su propio CSS (scoped, con variables) heredado directamente de sus mockups de diseño.
- **TypeScript** estricto (`astro check` da 0 errores/warnings).
- **[@fontsource](https://fontsource.org/)** para self-host de Archivo y JetBrains Mono (en vez de cargar Google Fonts por CDN).
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
| `/` | — | redirige a `/v1/` |
| `/v1/` · `/v1/en/` | Nature Distilled | ES (default) · EN |
| `/v2/` · `/v2/en/` | Motor de Datos | ES · EN |
| `/v3/` · `/v3/en/` | La Costa como Interfaz | ES · EN |

Las 3 comparten exactamente el mismo contenido y estructura de información; solo cambia la capa visual. Cada página tiene un selector flotante para saltar entre `v1`/`v2`/`v3` sin perder el idioma actual, y un toggle de modo oscuro cuya preferencia se comparte entre las 3 (misma clave de `localStorage`).

## Las 3 direcciones visuales

**v1 · Nature Distilled** — editorial cálido. Fondo crema `#FBF7EF`, navy `#122847`, acentos teal/amarillo. Tipografía Archivo + Arial. El titular del hero aparece palabra por palabra. Pensado para público general y donantes.

**v2 · Motor de Datos** — dashboard técnico, oscuro por defecto. Grid de puntos de fondo, JetBrains Mono en labels/eyebrows, contadores animados, pipeline de datos con flujo animado. Pensado para gobiernos, científicos, inversionistas.

**v3 · La Costa como Interfaz** — el isotipo/silueta de LatAm como protagonista. La línea de costa se dibuja sola al hacer scroll; scrollytelling con un panel fijo (`position: sticky`) que resalta el tipo de dato activo. La más distintiva de marca.

## Internacionalización

- Español (default, sin prefijo) e inglés (`/en`).
- **Todo el copy factual** (proceso, tipos de dato, entregables, aplicaciones, "quiénes somos", footer) vive en un único lugar por idioma: `src/data/content.es.ts` y `content.en.ts`. Se edita una vez y se refleja en las 3 versiones.
- El copy **de voz** de cada versión (titular del hero, eyebrows, labels del nav — el tono que efectivamente diferencia a v1/v2/v3) vive en `src/themes/<version>/copy.ts`.

## Estructura del proyecto

```
src/
├── data/                     # hechos compartidos (única fuente de verdad, es/en)
├── utils/                    # rutas y parser de titulares con acento
├── layouts/BaseLayout.astro  # <html>, fuentes, dark mode
├── components/shared/        # ThemeToggle, LanguageSwitcher, VersionSwitcher
├── scripts/                  # interacciones compartidas (scroll, reveal, magnetic buttons)
├── themes/
│   ├── v1-nature-distilled/  # tokens.css + copy.ts + Page.astro
│   ├── v2-motor-de-datos/
│   └── v3-costa-interfaz/
├── assets/brand/             # isotipo (color/blanco/negro), sacado del manual de marca
└── pages/                    # rutas — cada archivo son ~3 líneas
```

Para el detalle de por qué está organizado así (y las convenciones a seguir al editarlo), ver **[AGENTS.md](./AGENTS.md)**.

## Editar contenido

| Quiero cambiar... | Edito... |
|---|---|
| Un dato (proceso, tipos de entrada, entregables, aplicaciones, "nosotros", footer) | `src/data/content.es.ts` **y** `content.en.ts` |
| El titular/tono de una versión específica | `src/themes/<version>/copy.ts` |
| Colores o tipografía de una versión | `src/themes/<version>/tokens.css` |
| Layout/animaciones de una sección | `src/themes/<version>/Page.astro` |

