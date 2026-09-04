# Agente administrador de NATURA 2030

## Estado actual: prototipo sin ejecutor

La ruta `/admin/` incluye:

- login con credenciales configuradas por variables de entorno;
- sesión firmada, `HttpOnly`, `SameSite=Strict` y con expiración de ocho horas;
- chat conectado a la Responses API mediante una API key exclusivamente del lado servidor;
- carga controlada de imágenes, PDF, Word, Excel, CSV, JSON, GeoJSON y texto;
- política restrictiva visible en la interfaz y repetida en las instrucciones del servidor;
- ausencia total de herramientas de escritura o shell durante esta fase.

La arquitectura final está pensada para una VPS con un ejecutor privado y aislado. Mientras el frontend continú temporalmente en Vercel y ese ejecutor no existe, el administrador solo permite analizar y preparar propuestas: una modificación en el filesystem efímero de Vercel no cambiaría el repositorio ni produciría un despliegue durable.

## Operaciones permitidas en la fase VPS

El futuro ejecutor debe exponer operaciones estructuradas y limitadas, no una terminal genérica:

1. `update_landing_content`: modificar exclusivamente los archivos de contenido y la estructura del theme existente.
2. `add_map_location`: validar el esquema y agregar una entrada a `src/data/platform-locations.ts` junto con activos permitidos.
3. `add_model`: registrar un modelo dentro de `src/features/models/models/` y `registry.ts`, sujeto a validación y límites de ejecución.

El ejecutor debe rechazar cualquier ruta de archivo fuera de las allowlists de cada operación. La política del prompt ayuda a orientar al modelo, pero la seguridad real debe vivir en validadores deterministas del servidor.

## Flujo recomendado en la VPS

1. El agente recopila y valida la solicitud y los archivos.
2. Genera un plan y una vista previa del diff sin escribir en producción.
3. El usuario confirma el cambio de forma explícita.
4. Un worker crea una copia de trabajo aislada a partir de un commit conocido.
5. Aplica solo una operación allowlisted y verifica rutas, tamaños y tipos de archivo.
6. Ejecuta `pnpm check`, `pnpm build` y validaciones específicas de datos.
7. Muestra el diff final y requiere una segunda confirmación para publicar.
8. Crea un commit auditable y despliega de forma atómica.
9. Conserva el release anterior para rollback inmediato.

El proceso web del sitio no debería tener permisos directos de escritura sobre el checkout de producción. El worker debe ejecutarse con un usuario del sistema separado, sin privilegios, sin acceso general a secretos y con timeouts, cuotas de CPU/memoria y red restringida.

## Controles necesarios antes de habilitar escritura

- autenticación multiusuario o SSO, MFA y recuperación de acceso;
- rate limiting persistente y bloqueo de intentos fuera de memoria;
- protección CSRF y rotación de sesiones;
- almacenamiento privado de archivos con antivirus y eliminación programada;
- logs de auditoría inmutables con usuario, solicitud, diff, resultado y rollback;
- esquema estricto para puntos del mapa y manifiesto estricto para modelos;
- sandbox real para ejecutar modelos aportados por usuarios;
- backups, health checks y despliegues atómicos;
- límites de gasto, tokens, tamaño de archivos y concurrencia de la API;
- pruebas de prompt injection, especialmente sobre instrucciones ocultas dentro de documentos.

## Limitaciones principales

La limitación más importante no es el chat, sino ejecutar código aportado por el cliente. Un modelo nuevo puede contener Python malicioso, consumir recursos indefinidamente o acceder a red y secretos. Debe ejecutarse en un sandbox efímero separado; nunca dentro del proceso web ni directamente en el host de producción.

Una contraseña compartida es suficiente para un prototipo privado, pero no para operación real. Tampoco basta un prompt restrictivo: las acciones deben estar limitadas por código, esquemas, permisos del sistema y confirmaciones humanas.
