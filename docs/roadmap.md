 # Roadmap

## Completado

- Autenticacion local con cookie JWT.
- OAuth configurable para Google y GitHub.
- Workspaces, proyectos, colecciones y requests.
- Variables y secretos cifrados por entorno.
- API keys con scopes, expiracion, uso y revocacion.
- Autorizacion Bearer, Basic, API Key y OAuth2 Bearer.
- Flows y registro de ejecuciones.
- Documentos, mocks, invitaciones y codigo Share.
- Pruebas unitarias, de integracion, seguridad y E2E.

## Prioridad alta

1. Ejecutar scripts pre-request y post-response tambien en flows del backend.
2. Añadir una API de sandbox para scripts y limitar tiempo, memoria y acceso a red.
3. Completar pruebas de integracion autenticadas para crear entornos, secretos, API keys e invitaciones.
4. Rotar credenciales expuestas en configuraciones locales y separar secretos de desarrollo y produccion.
5. Mejorar manejo de errores y estados de carga en todas las vistas de workspace.

## Prioridad media

- Añadir filtros por estado y fecha al historial de ejecuciones.
- Permitir actualizar y eliminar entornos desde la interfaz.
- Añadir exportacion/importacion de colecciones y variables.
- Añadir pruebas de accesibilidad y navegacion por teclado.
- Documentar OpenAPI y generar una coleccion Postman mantenida automaticamente.

## Prioridad baja

- Notificaciones configurables por flow.
- Retencion configurable para historiales y logs.
- Roles y permisos mas granulares por proyecto.
- Observabilidad con metricas, trazas y alertas.
