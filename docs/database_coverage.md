# Cobertura funcional de tablas

Esta matriz conecta los modelos Prisma con su uso funcional.

| Modelo | Cobertura |
|---|---|
| User / Session | Autenticación, sesión y perfil |
| UserPreference | `GET/PATCH /api/auth/preferences` |
| Workspace / WorkspaceMember / WorkspaceInvitation | Dashboard, miembros e invitaciones |
| WorkspaceTheme | Configuración visual del workspace |
| Project / Collection / ApiRequest | Workspace, colecciones y requests |
| Environment / Secret | Variables y secretos por entorno |
| ApiKey | Gestión y autorización de requests |
| Flow / RequestExecution | Automatizaciones e historial de ejecuciones |
| Document | Vista Documents |
| MockServer / MockRoute | Vista Mocks y rutas públicas |
| Activity / Notification | Auditoría y avisos del workspace |
| AiChat / AiMessage | Asistente IA y conversaciones persistentes |

Todas las tablas tienen ahora un punto de entrada funcional; `UserPreference` quedó cubierto mediante las rutas de preferencias autenticadas.
