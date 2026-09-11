# Comandos de testing

Todos los comandos se ejecutan desde la raiz del proyecto:

```powershell
cd "c:\Users\TG computer\Documents\Api-Wallet"
```

## Suite completa

Ejecuta todas las pruebas del backend, incluidas las carpetas `unit`, `integration` y `security`:

```powershell
npm test
```

Comando equivalente:

```powershell
npm --prefix server test
```

## Pruebas unitarias

Pruebas de logica aislada, como el constructor de requests y la autorizacion:

```powershell
node --test server/tests/unit/**/*.test.js
node --test server/tests/api_services.test.js server/tests/authorization.test.js server/tests/encryption.test.js server/tests/flow.test.js
```

## Pruebas de integracion

Prueba Express, `/health`, conexion con PostgreSQL y rutas protegidas:

```powershell
node --test server/tests/integration/**/*.test.js
```

La base de datos configurada en `.env` debe estar disponible para que `/health` devuelva `database: ok`.

## Pruebas de seguridad

Comprueba rechazo de requests sin JWT o con tokens invalidos:

```powershell
node --test server/tests/security/**/*.test.js
```

## Build y lint del frontend

```powershell
npm run build --prefix apps/web
npm run lint --prefix apps/web
```

## Prueba E2E del navegador

La prueba inicia los servidores de desarrollo si no estan activos y comprueba login, workspace, Share, entornos, APIs externas, busqueda, consola y scripts:

```powershell
node apps/web/tests/e2e_live_browser.cjs
```

Requisitos:

- Backend disponible o iniciado automaticamente en `http://localhost:3000`.
- Frontend disponible o iniciado automaticamente en `http://localhost:5173`.
- PostgreSQL disponible y `.env` configurado.
- Usuario seed `alex@apiwallet.dev` con contrasena `ChangeMe123!`, o actualizar esas credenciales en la prueba.
- Acceso de red a `https://jsonplaceholder.typicode.com` y `https://httpbin.org`.

Los artefactos de la prueba quedan en:

```text
apps/web/tests/artifacts/
```

## Servidores para pruebas manuales

Iniciar backend y frontend juntos:

```powershell
npm run dev
```

Iniciar solo backend:

```powershell
npm run dev:backend
```

Iniciar solo frontend:

```powershell
npm run dev:frontend
```

## Prisma y datos de prueba

Regenerar el cliente Prisma:

```powershell
npm run prisma:generate --prefix server
```

Aplicar migraciones en desarrollo:

```powershell
npm run prisma:migrate --prefix server
```

Cargar datos seed:

```powershell
npm run seed --prefix server
```
