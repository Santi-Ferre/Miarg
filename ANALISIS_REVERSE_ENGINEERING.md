# Análisis de ingeniería inversa — Mi-Argentina

## Alcance y procedencia

- Copia local del repositorio `https://github.com/lmussofrannino-a11y/Mi-Argentina.git`.
- Rama: `main`; commit analizado: `703ef04` (`Add files via upload`).
- Código principal en `my-project-deploy/` (93 archivos versionados; Next.js App Router).
- Análisis estático del código fuente. No se instalaron dependencias ni se ejecutó la aplicación.
- No encontré README, instrucciones de despliegue ni archivo de ejemplo de variables de entorno.

## Resumen ejecutivo

El proyecto presenta una interfaz que imita la aplicación Mi Argentina y una vista de DNI digital. No es una integración oficial visible en el código: no aparecen flujos OAuth/OpenID Connect con el proveedor estatal. En cambio, el registro propio recopila email, contraseña y datos de identidad (DNI, domicilio, nacimiento, sexo, foto y firma), y persiste estos datos en una base PostgreSQL.

**Riesgo muy alto para usuarios y datos personales. No desplegar públicamente ni introducir credenciales, fotografías, firmas o datos reales.** La contraseña se almacena y compara en texto plano; hay una clave administrativa fija en el cliente y servidor; varias rutas entregan datos personales sin autenticación; y el service worker guarda respuestas exitosas de API en Cache Storage.

## Arquitectura

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS, componentes Radix/shadcn y Lucide.
- **Estado de interfaz:** Zustand con persistencia en `localStorage` (`mi-argentina-session`). Persiste `view` y `user`, y el objeto de usuario incluye datos DNI, foto y firma recibidos del servidor.
- **Backend:** rutas API del App Router (`src/app/api/**/route.ts`).
- **Persistencia:** Prisma 6 con PostgreSQL; se esperan `DATABASE_URL` y `DIRECT_URL`.
- **PWA:** `public/manifest.json` y `public/sw.js`, registrado desde `src/app/layout.tsx`.
- **Pantallas:** login, registro, inicio, documentos, visor DNI y administración, implementadas principalmente en un archivo grande `src/app/page.tsx`.

## Flujo funcional observado

1. El formulario de registro envía email, contraseña y datos personales al endpoint `/api/auth/register`.
2. La API crea `User` y `DniData`; deja la cuenta inactiva inicialmente. La interfaz incluye una vista previa de DNI con plantillas e imágenes incluidas en `public/`.
3. El login consulta `/api/auth/login`; compara la contraseña directamente contra el valor almacenado. Si la cuenta está activa, devuelve perfil y datos DNI.
4. La interfaz guarda el perfil en Zustand/localStorage y presenta pantallas de servicios y documento.
5. La vista de administración usa una clave fija para listar usuarios y activar/desactivar cuentas.

## Modelo de datos

`User`: `id`, `email` único, `password`, `isActive`, fechas y relación uno-a-uno con DNI.

`DniData`: nombre, apellido, número de DNI, domicilio, fecha de nacimiento/emisión, sexo, foto y firma como strings opcionales (comentadas como base64), además de números de trámite y campos auxiliares. La relación borra el DNI asociado al borrar al usuario.

## Endpoints y observaciones de seguridad

| Ruta | Función | Hallazgo estático |
|---|---|---|
| `POST /api/auth/register` | Crea cuenta y ficha DNI | Guarda contraseña sin hash; acepta y almacena datos sensibles e imágenes; no limita intentos ni aplica protección visible contra abuso. |
| `POST /api/auth/login` | Verifica credenciales | Comparación en texto plano; no crea sesión/cookie/token de autenticación. |
| `GET /api/user/[id]` | Devuelve usuario y DNI | Sin autenticación; excluye contraseña, pero devuelve los demás datos de DNI, incluida foto/firma. |
| `GET /api/dni/[userId]` | Devuelve ficha DNI | Sin autenticación ni comprobación de propiedad; entrega directamente la ficha. |
| `GET /api/admin/users` | Lista cuentas y DNI resumido | Protegido por `x-admin-key: admin123`, valor público y fijo en cliente y servidor. |
| `POST /api/admin/activate` | Activa/desactiva cuentas | Misma clave fija; cualquier persona que la conozca puede cambiar el estado de usuarios. |
| `GET /api` | Respuesta de estado | Devuelve `Hello, world!`; no parece tener otra lógica. |

El service worker usa network-first para API GET, almacena cada respuesta HTTP exitosa en Cache Storage y la reutiliza cuando no hay red. Esto puede conservar respuestas que contienen datos personales en el dispositivo. La app también persiste el perfil en localStorage. No vi en este análisis una política de sesión segura que restrinja esas exposiciones.

`next.config.ts` tiene `typescript.ignoreBuildErrors: true`, por lo que un build puede ocultar errores de TypeScript.

## Estructura relevante

```text
my-project-deploy/
  src/app/page.tsx                  UI y flujos de login/registro/DNI/admin
  src/app/api/auth/register/route.ts
  src/app/api/auth/login/route.ts
  src/app/api/user/[id]/route.ts
  src/app/api/dni/[userId]/route.ts
  src/app/api/admin/users/route.ts
  src/app/api/admin/activate/route.ts
  src/lib/db.ts                     cliente Prisma
  src/lib/store.ts                  estado persistido en localStorage
  prisma/schema.prisma              modelos User y DniData
  public/sw.js                      caché PWA, incluso respuestas API GET
  public/                           plantillas e imágenes de interfaz/DNI
```

## Ejecución indicada por los scripts

El package declara Bun y scripts `dev`, `build`, `start`, `db:generate` y `db:push`. Para iniciar localmente harían falta Bun, dependencias instaladas y PostgreSQL configurado con `DATABASE_URL` y `DIRECT_URL`. No ejecuté esos pasos. Los scripts de build/start incluyen sintaxis de shell (`cp`, `tee`, `NODE_ENV`) que puede requerir adaptación según se use PowerShell, CMD o un shell Unix.

## Prioridades si el propósito es auditar o reutilizar el código

1. No usar datos reales ni publicar el servicio en su estado actual.
2. Retirar el flujo de captura de credenciales/datos de identidad si no es un entorno de demostración autorizado.
3. Reemplazar el login por un proveedor de identidad oficial y sesiones seguras; nunca almacenar contraseñas en claro.
4. Exigir autorización en cada ruta y comprobar que cada usuario solo acceda a sus propios datos.
5. Eliminar la clave administrativa del código cliente y usar controles de administración seguros, configurados fuera del repositorio.
6. Excluir endpoints personales del cache del service worker y evitar persistir fotos/firmas/documentos en localStorage.
7. Revisar los recursos de DNI y el propósito del sistema antes de distribuirlo; la interfaz y las plantillas permiten simular un documento.

## Limitaciones

Conclusiones basadas en lectura de archivos y rutas presentes en el commit indicado. No se verificó el comportamiento en ejecución, no se inspeccionó infraestructura remota ni se realizó prueba de penetración.

## Estado posterior al análisis inicial

El proyecto se refactorizó para ser una demostración pública con perfiles inventados. El frontend ya no pide credenciales ni datos de identidad, y las rutas antiguas de usuarios, DNI, login, registro y administración están deshabilitadas con respuesta 410.

La actividad global guarda solo contadores anónimos en Upstash Redis. El panel administrativo requiere `ADMIN_PASSWORD` y `ADMIN_SESSION_SECRET`, configurados como secretos de servidor en el entorno de despliegue. No se registra perfil, IP ni identificador de visitante. La página deja de registrar el service worker anterior y limpia su estado/caché heredados al abrirse.

El acceso al panel y las métricas requieren `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN`; los pasos están en `my-project-deploy/DEPLOY_VERCEL.md`. No se ejecutó build ni despliegue.
