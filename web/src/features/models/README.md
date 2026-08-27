# Model laboratory

The laboratory is part of the static Astro deployment. Scientific code runs in the visitor's browser; there is no application backend.

## Structure

- `registry.ts` is the catalog's source of truth.
- `models/<model-id>/` contains the scientific implementation for a model.
- `runtime/` defines the shared worker protocol and runtime adapters.
- `ModelLab.tsx` is the interactive client surface.
- `ModelsPage.astro` and `ModelDetailPage.astro` provide the Astro shell and route content.

## Adding a model

1. Add its metadata and localized routes to `registry.ts`.
2. Put the model source under `models/<model-id>/`.
3. Implement a Web Worker that speaks the request/response types in `runtime/protocol.ts`.
4. Add the model-specific React controls and renderer. Reuse the catalog and shell styles.
5. Add Spanish and English static routes under `src/pages/models/`.

Use Pyodide for NumPy-compatible Python models, a TypeScript worker for small browser-native solvers, or WebAssembly when profiling demonstrates that it is required. Keep the scientific implementation single-sourced and validate numerical output before optimizing the runtime.
