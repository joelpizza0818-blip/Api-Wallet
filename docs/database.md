## Modelo de datos

La base de datos usa PostgreSQL y Prisma. El modelo completo vive en `prisma/schema.prisma` y la migracion aplicable en `prisma/migrations/20260910024320_complete_data_model`.

### Dominios

- `users`, `sessions` y `user_preferences`: identidad, autenticacion y preferencias de interfaz.
- `workspaces`, `workspace_members` y `workspace_invitations`: pertenencia, roles e invitaciones.
- `projects`, `collections` y `api_requests`: catalogo de APIs.
- `environments` y `secrets`: configuracion por entorno; los secretos se almacenan cifrados.
- `api_keys`: credenciales con hash, scopes, expiracion y revocacion.
- `flows` y `request_executions`: ejecuciones programadas y su historial.
- `documents`, `mock_servers` y `mock_routes`: documentacion y servidores mock.
- `activities` y `notifications`: auditoria y avisos por workspace.

### Integridad

Las relaciones tienen claves foraneas con borrado en cascada solo para recursos dependientes. Las entidades compartidas o de auditoria usan `RESTRICT` o `SET NULL`. Hay indices para las consultas por workspace, proyecto, estado, fecha de ejecucion y propietario, ademas de restricciones unicas por nombre dentro de cada padre.

La migracion agrega tambien checks para metodos HTTP validos, paths, puertos, codigos HTTP, frecuencias de flows y formato de los ultimos cuatro caracteres de una API key.

### Comandos

```bash
npx prisma migrate deploy --schema prisma/schema.prisma
npx prisma generate --schema prisma/schema.prisma
```
