 # Arquitectura

## Vista general

API-Wallet es una aplicacion web React/Vite con un backend Express y PostgreSQL administrado por Prisma.

```text
Navegador React/Vite
	|
	| fetch + cookie JWT
	v
Express /api
	|
	+-- middleware de seguridad, CORS, rate limit y autenticacion
	+-- controllers
	+-- services de dominio
	v
Prisma Client -> PostgreSQL
```

## Frontend

- `apps/web/src/App.jsx` compone la aplicacion.
- `routes` selecciona las paginas publicas, autenticacion, invitaciones y workspace.
- `WorkspaceContext` mantiene workspace, proyecto, colecciones, entornos y API keys activas.
- Las vistas de requests permiten construir requests, aplicar autorizacion, interpolar variables y mostrar respuestas.
- `FeedbackContext` centraliza notificaciones y confirmaciones.

## Backend

- `server/src/app.js` configura Helmet, CORS, JSON, rate limiting, sesiones Passport y rutas.
- `server/src/routes` agrupa endpoints por dominio.
- `controllers` validan acceso y traducen HTTP a operaciones de servicio.
- `services` contienen reglas de negocio, cifrado, autorizacion, ejecucion y correo.
- `middleware/auth.middleware.js` valida JWT desde cookie o Bearer token.
- `prisma/schema.prisma` define el modelo y las relaciones.

## Aislamiento de datos

Cada proyecto pertenece a un workspace. Antes de leer o mutar recursos, los controladores resuelven el proyecto y comprueban la membresia mediante `authorization.service`. Las operaciones de escritura requieren roles `OWNER`, `ADMIN` o `DEVELOPER` segun el dominio; las operaciones administrativas requieren `OWNER` o `ADMIN`.

## Ejecucion de requests

El runner resuelve variables de entorno, crea headers de autorizacion, valida URLs y bloquea destinos privados fuera del modo desarrollo. Guarda el resultado en `request_executions` y actualiza el ultimo estado de la request.

Los scripts pre-request y post-response se ejecutan actualmente en `ApiInspector` del navegador. Se guardan en colecciones y requests, pero los flows ejecutados en backend aun no los ejecutan.

## Seguridad de datos

- Secretos: cifrado reversible con AES-GCM.
- API keys: hash irreversible para validacion y valor cifrado para uso interno del runner.
- Sesiones: JWT en cookie HTTP-only.
- Invitaciones: token crudo solo se envia al destinatario; en base de datos se almacena su hash.
