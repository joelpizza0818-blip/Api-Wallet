# API-Wallet

API-Wallet es una plataforma web para centralizar credenciales, documentar APIs y ejecutar solicitudes desde un workspace seguro. Permite organizar APIs por proyectos y colecciones, administrar entornos, guardar secretos cifrados, crear API keys, automatizar comprobaciones y consultar el historial de ejecuciones.

> **Estado:** aplicación en desarrollo activo.

## Características

- Autenticación local, Google OAuth y GitHub OAuth.
- Workspaces con miembros, roles, invitaciones y códigos de acceso.
- Proyectos, entornos, colecciones y solicitudes HTTP.
- Headers, parámetros, body y autorización Bearer, Basic, API Key y OAuth 2.0.
- Secretos cifrados y API keys con scopes, expiración y revocación.
- Flows automatizados, ejecuciones manuales e historial de resultados.
- Documentos, servidores mock, rutas mock, notificaciones y actividad.
- Preferencias de tema y chat de IA.
- API REST protegida por cookie de sesión o Bearer token.

## Arquitectura

```text
apps/web/        Frontend React + Vite
server/          Backend Express + Passport
prisma/          Esquema, migraciones y seed de PostgreSQL
docs/            Documentación técnica y de API
```

En producción, el frontend se despliega en Vercel, el backend en Render y PostgreSQL en Supabase.

## Requisitos

- Node.js 20 o superior.
- npm.
- PostgreSQL 14 o superior; Supabase es compatible.
- Credenciales OAuth opcionales para Google y GitHub.

## Instalación local

```bash
git clone https://github.com/joelpizza0818-blip/Api-Wallet.git
cd Api-Wallet
npm install
npm install --prefix server
npm install --prefix apps/web
```

Configura los archivos de entorno:

```bash
copy server\.env.example server\.env
copy apps\web\.env.example apps\web\.env
```

En macOS/Linux usa `cp` en lugar de `copy`.

Variables mínimas de `server/.env`:

```env
NODE_ENV=development
PORT=3000
DATABASE_URL="postgresql://usuario:password@localhost:5432/api_vault?schema=public"
JWT_SECRET="genera-un-secreto-largo-y-aleatorio"
SESSION_SECRET="genera-otro-secreto-largo-y-aleatorio"
ENCRYPTION_KEY="clave-de-32-bytes-para-cifrado"
FRONTEND_URL="http://localhost:5173"
```

En `apps/web/.env`:

```env
VITE_API_URL=http://localhost:3000
```

No subas archivos `.env` ni credenciales al repositorio.

## Base de datos y Prisma

```bash
npm run prisma:generate --prefix server
npx prisma migrate deploy --schema prisma/schema.prisma
```

Para crear migraciones durante el desarrollo:

```bash
npm run prisma:migrate --prefix server
```

Para cargar datos de demostración:

```bash
npm run seed --prefix server
```

Las migraciones son la fuente de verdad de la base de datos. No uses `prisma migrate dev` en producción.

## Ejecución

```bash
npm run dev
```

También puedes iniciar cada servicio por separado:

```bash
npm run dev:backend
npm run dev:frontend
```

URLs locales: frontend `http://localhost:5173`, backend `http://localhost:3000` y health check `http://localhost:3000/health`.

## Despliegue

### Frontend en Vercel

Configura el Root Directory como `apps/web`, Build Command como `npm run build`, Output Directory como `dist` y añade:

```env
VITE_API_URL=https://TU-BACKEND.onrender.com
```

### Backend en Render

Si el Root Directory es `server`:

```bash
# Build Command
npm install && npm run prisma:generate && npx prisma migrate deploy --schema ../prisma/schema.prisma

# Start Command
npm start
```

Si Render utiliza la raíz del repositorio:

```bash
npm install --prefix server && npx prisma generate --schema prisma/schema.prisma && npx prisma migrate deploy --schema prisma/schema.prisma
```

Variables esenciales:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://...
JWT_SECRET=...
SESSION_SECRET=...
ENCRYPTION_KEY=...
FRONTEND_URL=https://TU-FRONTEND.vercel.app
```

`DATABASE_URL` debe apuntar a la misma base de Supabase sobre la que se ejecutan las migraciones.

## OAuth

Los callbacks apuntan al backend, no a Vercel:

```env
GOOGLE_CALLBACK_URL=https://TU-BACKEND.onrender.com/api/auth/google/callback
GITHUB_CALLBACK_URL=https://TU-BACKEND.onrender.com/api/auth/github/callback
```

Registra exactamente esas URLs en Google Cloud Console y GitHub OAuth Apps. El backend crea la cookie de sesión y redirige al frontend configurado en `FRONTEND_URL`.

En producción, la cookie OAuth usa `SameSite=None` y `Secure` porque Vercel y Render son dominios distintos. El frontend realiza peticiones con `credentials: 'include'`.

## API

La API está disponible bajo `/api`:

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Comprueba servicio y base de datos |
| `POST` | `/api/auth/register` | Registra un usuario local |
| `POST` | `/api/auth/login` | Inicia sesión |
| `GET` | `/api/auth/me` | Devuelve el usuario actual |
| `GET` | `/api/workspaces` | Lista los workspaces del usuario |
| `GET` | `/api/projects/:projectId/collections` | Lista colecciones |
| `POST` | `/api/flows/:flowId/run` | Ejecuta un flow manualmente |

Consulta el inventario completo en [`docs/api.md`](docs/api.md).

## Seguridad

- Los secretos se cifran antes de almacenarse.
- Las API keys se almacenan con hash y solo se muestran completas al crearlas.
- Las rutas protegidas requieren sesión o `Authorization: Bearer <jwt>`.
- CORS está limitado al frontend configurado.
- Helmet y rate limiting están habilitados.
- Nunca uses secretos reales en commits, capturas, logs o archivos `.env`.
- Si una credencial se expone, revócala y genera una nueva inmediatamente.

## Pruebas y calidad

```bash
npm test
npm run lint --prefix apps/web
npm run build --prefix apps/web
```

## Troubleshooting

### `P2022: column ... does not exist`

La base de datos no tiene las migraciones aplicadas. Ejecuta:

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
```

Confirma que `DATABASE_URL` apunta a la base correcta.

### `/api/auth/me` devuelve `401` después de OAuth

Verifica `FRONTEND_URL`, `VITE_API_URL`, `NODE_ENV=production` y que la cookie OAuth use `SameSite=None; Secure`.

### Google o GitHub muestran `auth_failed`

Comprueba que el callback registrado coincida carácter por carácter con `GOOGLE_CALLBACK_URL` o `GITHUB_CALLBACK_URL`, incluyendo protocolo, dominio y ruta.

### Render responde `Internal server error`

Revisa los logs y confirma `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_URL` y las credenciales OAuth. `/health` debe indicar `database: ok`.

## Documentación adicional

- [Referencia de la API](docs/api.md)
- [Arquitectura](docs/architecture.md)
- [Base de datos](docs/database.md)
- [Seguridad](docs/security.md)
- [Comandos de prueba](docs/test_commands.md)

## Licencia

Este proyecto no declara todavía una licencia open source. Consulta al propietario antes de redistribuirlo o utilizarlo comercialmente.
