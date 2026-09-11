 # Seguridad

## Autenticacion

- Registro y login local usan bcrypt para contrasenas.
- Los JWT expiran en siete dias y se validan en cada request protegida.
- La cookie de sesion es HTTP-only, `sameSite: lax` y `secure` en produccion.
- Google y GitHub solo deben habilitarse con credenciales OAuth validas y callbacks registrados.
- Existe rate limit para endpoints de autenticacion y para la API.

## Autorizacion y aislamiento

Los endpoints protegidos requieren autenticacion. Los controladores verifican que el usuario sea miembro del workspace asociado al recurso y que tenga el rol necesario. No se debe confiar en IDs enviados por el frontend sin pasar por `projectAccess`, `collectionAccess` o `requireWorkspaceRole`.

## Secretos y API keys

- Secretos de entorno: AES-GCM con version de clave.
- API keys: hash SHA-256 para comparar y valor cifrado para ejecucion interna.
- El frontend no recibe el valor completo de una API key existente.
- Las claves revocadas o expiradas no deben usarse para autorizacion.
- Las respuestas de listas deben mostrar solo metadatos y ultimos cuatro caracteres.

## Ejecucion remota

El request runner solo permite HTTP y HTTPS. Resuelve DNS y bloquea IPs privadas, loopback y link-local fuera de desarrollo para reducir SSRF. Las redirecciones se rechazan y las requests tienen timeout.

## Invitaciones

Los tokens de invitacion por correo se generan aleatoriamente, se almacenan como hash y expiran. La aceptacion exige que el correo de la invitacion coincida con el usuario autenticado. Los codigos `WS-...` deben compartirse solo con personas autorizadas y pueden regenerarse.

## Scripts

Los scripts personalizados se ejecutan con `new Function` en el navegador. Actualmente no existe un sandbox fuerte para JavaScript, por lo que solo usuarios confiables deben editar scripts. Antes de habilitar ejecucion server-side se debe implementar aislamiento de proceso, timeout, limites de memoria y una lista de APIs permitidas.

## Configuracion operativa

- No subir `.env` al repositorio.
- Rotar inmediatamente cualquier secreto que haya sido expuesto.
- Usar valores diferentes para desarrollo, pruebas y produccion.
- Configurar `FRONTEND_URL`, `DATABASE_URL`, `JWT_SECRET`, `ENCRYPTION_KEY` y credenciales SMTP mediante el entorno de despliegue.
- Ejecutar `npm test` y el E2E antes de publicar cambios sensibles.
