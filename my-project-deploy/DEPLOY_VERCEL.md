# Publicar la demo en Vercel

## Alcance y datos

La página genera perfiles inventados en memoria del navegador. No pide nombre, DNI, correo, contraseña, domicilio real, foto ni firma; tampoco envía el perfil generado al servidor.

Las métricas globales guardan únicamente contadores de visitas, perfiles ficticios generados, credenciales abiertas y secciones consultadas. Redis conserva totales y cantidades por día (los registros diarios vencen a los 90 días). No guardamos perfiles, IP ni identificadores de visitantes. Estos números sirven como analítica orientativa; el endpoint público puede ser llamado por automatizaciones y las cifras pueden inflarse.

El panel administrador está protegido por clave comprobada en el servidor y una cookie firmada `HttpOnly`, `Secure` en producción y `SameSite=Strict`. Las estadísticas solo se devuelven con una sesión válida. La clave no se incluye en el JavaScript público.

## Preparar las variables

1. Crea una base Redis en Upstash y copia su **REST URL** y **REST token**.
2. Genera una clave de administrador privada de al menos 16 caracteres. Usa una contraseña aleatoria guardada en tu gestor de contraseñas.
3. Genera `ADMIN_SESSION_SECRET` aleatorio de al menos 32 caracteres. Por ejemplo, `openssl rand -base64 48`.
4. En Vercel abre **Project → Settings → Environment Variables** y agrega:

   - `ADMIN_PASSWORD`
   - `ADMIN_SESSION_SECRET`
   - `UPSTASH_REDIS_REST_URL`
   - `UPSTASH_REDIS_REST_TOKEN`

   No agregues el prefijo `NEXT_PUBLIC_`. Marca los valores secretos como sensibles. Para Preview usa otra base Redis o deja estas variables solo en Production.
5. Luego de guardar las variables, vuelve a desplegar para que las funciones las reciban.

`.env.example` muestra los nombres con valores de reemplazo. Para desarrollo local, crea `.env.local` a partir de ese ejemplo y no subas los secretos a Git.

## Configurar el proyecto

- Importa el repositorio en Vercel.
- Configura **Root Directory** como `my-project-deploy`.
- Framework: Next.js. Build command recomendado: `bun run build`.
- Agrega las cuatro variables de entorno y despliega.
- Abre el sitio público, genera varios perfiles ficticios, visita sus credenciales y luego abre **Acceso administrador** para revisar los contadores.

Si las variables de Upstash faltan, la demo de perfiles sigue funcionando, pero no se registran métricas globales. Si faltan las variables de administración, el panel no permite iniciar sesión.

## Protección y límites

- `/api/auth/*`, `/api/user/*`, `/api/dni/*` y las antiguas rutas administrativas responden `410 Gone`; no crean ni devuelven cuentas o DNI.
- El endpoint de eventos acepta únicamente un tipo de evento fijo y descarta cualquier cuerpo con campos adicionales.
- El secreto Redis y la contraseña se usan solo en funciones del servidor.
- Las cifras no identifican a visitantes y no se pueden desglosar por persona. Si se necesita limitar abuso, configura límites de solicitudes en la capa de firewall de Vercel; la aplicación no guarda IPs para hacer ese control.
- La UI es una demo ficticia, no un documento válido ni una integración con servicios estatales.


