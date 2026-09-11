 # API de API-Wallet

## Base

- Backend: `http://localhost:3000`
- Health check: `GET /health`
- Las rutas de negocio viven bajo `/api`.
- La autenticacion acepta cookie `api_vault_token` o header `Authorization: Bearer <jwt>`.
- Las respuestas exitosas usan `{ success: true, data: ... }`, salvo autenticacion, que devuelve `user`.

## Autenticacion

Para el despliegue con Vercel y Render, configura `FRONTEND_URL` en Render con `https://api-wallet-phi.vercel.app` y `VITE_API_URL` en Vercel con la URL publica del backend de Render. Google debe usar como callback `${VITE_API_URL}/api/auth/google/callback`. El callback crea la cookie `api_vault_token` y redirige a `/auth/callback` en el frontend, que valida la sesion con `/api/auth/me`.

| Metodo | Ruta | Descripcion |
|---|---|---|
| `POST` | `/api/auth/register` | Registra usuario local y crea sesion |
| `POST` | `/api/auth/login` | Inicia sesion local |
| `POST` | `/api/auth/logout` | Elimina la cookie de sesion |
| `GET` | `/api/auth/me` | Devuelve el usuario autenticado |
| `PATCH` | `/api/auth/me` | Actualiza nombre y avatar |
| `POST` | `/api/auth/change-password` | Cambia la contrasena |
| `GET/PATCH` | `/api/auth/preferences` | Lee o actualiza preferencias |

## Workspaces y proyectos

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET/POST` | `/api/workspaces` | Lista o crea workspaces |
| `GET/PATCH/DELETE` | `/api/workspaces/:workspaceId` | Consulta, actualiza o elimina un workspace |
| `GET/POST` | `/api/workspaces/:workspaceId/projects` | Lista o crea proyectos |
| `GET/PATCH/DELETE` | `/api/projects/:projectId` | Gestiona un proyecto |
| `GET/POST` | `/api/projects/:projectId/collections` | Lista o crea colecciones |
| `PATCH/DELETE` | `/api/collections/:collectionId` | Actualiza o elimina una coleccion |
| `GET/POST` | `/api/collections/:collectionId/requests` | Lista o crea requests |
| `PATCH/DELETE` | `/api/requests/:requestId` | Actualiza o elimina una request |

## Entornos, secretos y API keys

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET/POST` | `/api/projects/:projectId/environments` | Lista o crea entornos |
| `GET/POST` | `/api/environments/:environmentId/secrets` | Lista o crea secretos cifrados |
| `DELETE` | `/api/secrets/:secretId` | Elimina un secreto |
| `GET/POST` | `/api/projects/:projectId/api-keys` | Lista o crea API keys |
| `DELETE` | `/api/api-keys/:apiKeyId` | Revoca y elimina permanentemente una API key |

Los valores completos de una API key solo se devuelven al crearla. Revocar una clave la elimina permanentemente; las ejecuciones historicas conservan su registro y dejan `apiKeyId` en `null`.

## Invitaciones y automatizaciones

| Metodo | Ruta | Descripcion |
|---|---|---|
| `GET/POST` | `/api/workspaces/:workspaceId/invitations` | Lista o crea invitaciones por correo |
| `GET` | `/api/invitations/mine` | Lista invitaciones del usuario |
| `POST` | `/api/invitations/accept` | Acepta una invitacion por token |
| `POST` | `/api/workspaces/join-code` | Se une usando un codigo `WS-...` |
| `GET/POST` | `/api/projects/:projectId/flows` | Lista o crea flows |
| `POST` | `/api/flows/:flowId/run` | Ejecuta un flow ahora |
| `GET` | `/api/projects/:projectId/executions` | Consulta historial de ejecuciones |

Tambien existen rutas para documentos, mocks, temas y chats de IA. El listado canonico de rutas se encuentra en `server/src/routes`.
