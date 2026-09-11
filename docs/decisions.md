 # Decisiones tecnicas

## PostgreSQL y Prisma

Se usa PostgreSQL como almacenamiento principal y Prisma como cliente y fuente declarativa del modelo. Esto permite aplicar migraciones versionadas, relaciones con integridad referencial e indices por workspace, proyecto y estado.

## JWT en cookie HTTP-only

La sesion local usa un JWT en la cookie `api_vault_token`. El middleware tambien acepta Bearer token para clientes API. La cookie es `secure` en produccion y usa `sameSite: lax`.

## Cifrado separado de hashing

Los secretos y valores de API keys necesitan recuperarse para ejecutar requests, por eso se cifran con AES-GCM. La validacion de una API key no necesita recuperar su valor, por eso tambien se guarda un SHA-256 irreversible.

## Revocacion permanente de API keys

Una API key revocada se elimina permanentemente. Las ejecuciones historicas conservan su registro porque la relacion `apiKeyId` usa `ON DELETE SET NULL`.

## Workspaces como limite de autorizacion

La membresia y el rol se comprueban en el workspace propietario del recurso. El frontend no se considera una frontera de seguridad; todos los permisos se repiten en backend.

## Invitaciones por codigo y por correo

El boton Share usa un codigo persistente `WS-...` del workspace. Las invitaciones por correo usan tokens aleatorios de un solo uso logico, guardados como hash y con expiracion de siete dias.

## Scripts compatibles con Postman a escala limitada

Se adopta una API pequena (`pm.variables`, `pm.request`, `pm.response`, `pm.expect` y `pm.test`) para el inspector. La ejecucion usa `new Function` en el navegador, por lo que debe tratarse como una superficie de confianza y no como un sandbox para codigo no confiable.

## E2E contra servicios publicos estables

La prueba de navegador usa JSONPlaceholder y httpbin para verificar conectividad real sin depender de credenciales de terceros. El resto de la suite usa la base local y mocks controlados.
