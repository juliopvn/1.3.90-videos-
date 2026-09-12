# Prompt para agente de IA — Implementación de VideoVault


---

## 0. Rol y forma de trabajo

Eres un agente de ingeniería de software autónomo. Vas a construir **VideoVault**, una plataforma de gestión de vídeos, siguiendo las fases descritas más abajo, en orden, sin adelantarte.

Reglas de trabajo obligatorias:

1. **No avances de fase sin cumplir los criterios de aceptación** de la fase actual. Si algo no puede validarse, dilo explícitamente antes de continuar.
2. **Haz un commit de git por fase completada**, con mensaje descriptivo (`feat(auth): registro y login con JWT`, etc.).
3. **Nunca hardcodees secretos** (claves, contraseñas, connection strings) en el código. Todo secreto va en variables de entorno leídas desde `process.env`.
4. Si te falta información para continuar (credenciales, decisiones de producto, nombres de cuentas/servicios), **detente y pregúntame** en vez de asumir o inventar valores.
5. No crees un `README.md` durante las fases de desarrollo local — **ya existe uno en el repositorio** y no debe recrearse ni sobrescribirse hasta la Fase 13 (despliegue público), donde se **actualiza** (no se reemplaza por completo) añadiendo la sección de despliegue.
6. Sí debes crear `AGENTS.md` y `.env.example` (ver Fase 9 y Fase 1).
7. Prioridad número uno: **la app debe funcionar al 100% en local** (Fases 0–11) antes de tocar CI/CD o despliegue público (Fases 12–13).

---

## 1. Contexto del proyecto

**Objetivo:** construir una plataforma de gestión de vídeos con subida directa desde el navegador a un storage S3 (RustFS), metadatos y búsqueda en MongoDB, reproducción HTML5 y dashboard de uso.

### Funcionalidades

- Subida client-side directa a S3 con URLs prefirmadas — el vídeo nunca pasa por el servidor Next.js.
- Autenticación clásica: registro/login con contraseña (`bcryptjs`) y sesión JWT (`jose`).
- Metadatos por vídeo: nombre, descripción, fecha, tags y pares clave-valor libres.
- Búsqueda por tags, nombre, descripción y metadatos.
- Reproducción de vídeo con el reproductor HTML5 apuntando a URLs prefirmadas de lectura.
- Dashboard con número de vídeos subidos y espacio ocupado.

### Arquitectura

```
Navegador (sube el vídeo directamente)
   │  PUT (presigned URL) ──────────────► RustFS (S3), bucket "videos", puerto 9001
   │  GET (presigned URL) ◄──────────────
   │
   │  <video> HTML5 (src = presigned GET URL)
   │
   └── metadatos, auth ─────────────────► API Routes → MongoDB (db "videovault")
```

| Capa | Tecnología |
|---|---|
| Frontend | Next.js 16 (App Router), React 19, Tailwind, `context/` global |
| Backend | API Routes + `middleware.ts` |
| Storage | RustFS S3-compatible (`@aws-sdk/client-s3` + presigned URLs) — **en local**. En producción (Fase 13) se sustituye por **Cloudflare R2**, también S3-compatible, sin cambios de código, solo de configuración/endpoint. |
| Metadatos | MongoDB (driver nativo), BD `videovault` — **en local**. En producción, **MongoDB Atlas**. |
| Auth | Registro/login con `bcryptjs` + JWT (`jose`) |

### Solución (principios de diseño que el agente debe respetar)

1. **URLs prefirmadas en ambos sentidos**: para subir, el servidor genera una URL de escritura temporal y el navegador hace el `PUT` directo a S3 (el backend nunca recibe el binario del vídeo). Para reproducir, el servidor genera una URL de lectura temporal usada como `src` del `<video>`. Las credenciales S3 nunca salen del servidor.
2. **Binario y metadatos separados**: el vídeo vive en S3 y MongoDB solo guarda `{ s3Key, nombre, descripcion, tags, kv, fecha, tamaño, userId }`. Buscar y listar es barato; S3 solo se toca al reproducir o al generar la URL de subida.
3. **Metadatos clave-valor libres**: además de los tags, cada vídeo admite pares arbitrarios (`proyecto: demo`, `cliente: acme`), que la búsqueda de MongoDB consulta sin necesidad de esquema fijo.
4. **Dashboard por agregación**: el espacio ocupado y el conteo salen de un pipeline de agregación de MongoDB sobre los tamaños guardados en los metadatos.

---

## 2. Fases de implementación

### Fase 0 — Bootstrap del proyecto

- Crear proyecto Next.js 16 (App Router, TypeScript, Tailwind).
- Configurar estructura de carpetas: `app/`, `app/api/`, `lib/`, `context/`, `models/` (o `lib/db/models`), `middleware.ts`, `tests/e2e/`.
- Instalar dependencias: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`, `mongodb`, `bcryptjs`, `jose`.
- Configurar `docker-compose.yml` con dos servicios: `mongodb` (imagen oficial, puerto 27017) y `rustfs` (puerto 9001, con volumen persistente).

**Criterio de aceptación:** `docker compose up -d` levanta MongoDB y RustFS sin errores; `npm run dev` sirve la app en local.

### Fase 1 — Variables de entorno y `.env.example`

Crear `.env.example` en la raíz del repo (sin valores reales, solo placeholders/documentación) con al menos:

```
# MongoDB
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=videovault

# RustFS (S3-compatible)
RUSTFS_ENDPOINT=http://localhost:9001
RUSTFS_ACCESS_KEY=your-access-key
RUSTFS_SECRET_KEY=your-secret-key
RUSTFS_BUCKET=videos
RUSTFS_REGION=us-east-1

# Auth
JWT_SECRET=replace-with-a-long-random-secret
JWT_EXPIRES_IN=7d

# App
NEXT_PUBLIC_APP_URL=http://localhost:3000
NODE_ENV=development
```

Documentar en un comentario, arriba del archivo, cómo generar `JWT_SECRET` (ej. `openssl rand -base64 32`) y qué variables cambiarán en producción (se detallan en la Fase 13).

**Criterio de aceptación:** `.env.example` versionado en git; `.env.local` (con valores reales) está en `.gitignore`.

### Fase 2 — Conexión a MongoDB y modelos

- Cliente singleton de MongoDB (reutilizable entre requests, patrón recomendado por Next.js).
- Colecciones: `users`, `videos`.
- Índices: `videos.tags`, `videos.userId`, índice de texto sobre `nombre`/`descripcion` para búsqueda.

**Criterio de aceptación:** test de conexión (script o endpoint de salud) confirma lectura/escritura contra MongoDB local.

### Fase 3 — Autenticación

- `POST /api/auth/register`: valida input, hashea contraseña con `bcryptjs`, crea usuario.
- `POST /api/auth/login`: valida credenciales, firma JWT con `jose`, setea cookie httpOnly.
- `POST /api/auth/logout`: limpia la cookie.
- `middleware.ts`: protege rutas privadas (`/dashboard`, `/api/videos/*`) verificando el JWT.
- Contexto global (`context/AuthContext`) para exponer el usuario autenticado al frontend.

**Criterio de aceptación:** registro, login, acceso a ruta protegida y logout funcionan de punta a punta vía UI y vía curl/Postman.

### Fase 4 — Integración con RustFS (URLs prefirmadas)

- Cliente S3 configurado con `RUSTFS_ENDPOINT`, credenciales y `forcePathStyle: true`.
- Lógica para crear el bucket `videos` si no existe al arrancar.
- `POST /api/videos/presign-upload`: genera URL de escritura temporal (`PutObjectCommand` + `getSignedUrl`), devuelve URL + `s3Key`.
- `GET /api/videos/[id]/presign-download`: genera URL de lectura temporal (`GetObjectCommand` + `getSignedUrl`) para el vídeo solicitado, validando que el usuario tiene acceso.

**Criterio de aceptación:** desde el navegador se puede hacer `PUT` directo a la URL prefirmada y luego `GET` con otra URL prefirmada, sin que el binario pase por Next.js (verificable inspeccionando la pestaña Network).

**Nota para producción (aplica en Fase 13):** cuando el bucket viva en un origen distinto al de la app (Cloudflare R2 en vez de `localhost:9001`), el bucket necesita una **política CORS explícita** que permita `PUT`/`GET` desde el dominio público de la app (`https://videovault.jpavon-tech.com`); si no, el navegador bloqueará la subida/reproducción aunque la URL prefirmada sea válida. Deja el cliente S3 parametrizado por variables de entorno (`endpoint`, `region`, `forcePathStyle`) para que este cambio de proveedor en producción no toque código, solo configuración.

### Fase 5 — Subida de vídeos y metadatos (CRUD)

- Flujo de subida en frontend: pedir presigned URL → `PUT` directo a RustFS con progreso → al terminar, `POST /api/videos` con metadatos (`nombre`, `descripcion`, `tags[]`, `kv{}`, `s3Key`, `tamaño`, `fecha`).
- `GET /api/videos`: lista paginada de vídeos del usuario.
- `GET /api/videos/[id]`: detalle de un vídeo.
- `DELETE /api/videos/[id]`: borra metadatos en Mongo y objeto en RustFS.

**Criterio de aceptación:** un usuario puede subir un vídeo con metadatos, verlo en su listado, ver el detalle y borrarlo (confirmando que también desaparece de RustFS).

### Fase 6 — Búsqueda por metadatos

- `GET /api/videos/search?q=&tags=&kv=`: búsqueda combinando texto libre (nombre/descripción), tags y pares clave-valor.
- UI de búsqueda en el frontend con filtros.

**Criterio de aceptación:** búsquedas por nombre, por tag y por par clave-valor devuelven resultados correctos contra datos de prueba.

### Fase 7 — Reproducción HTML5

- Página de detalle con `<video controls>` cuyo `src` es la presigned GET URL (renovable si expira).
- Manejo de estados de carga/error del reproductor.

**Criterio de aceptación:** el vídeo subido en la Fase 5 se reproduce correctamente en el navegador.

### Fase 8 — Dashboard de uso

- `GET /api/dashboard`: pipeline de agregación en Mongo que devuelve número total de vídeos y suma de `tamaño` (espacio ocupado) por usuario.
- Página `/dashboard` que muestra estos datos.

**Criterio de aceptación:** los números del dashboard coinciden con los vídeos realmente subidos por el usuario de prueba.

### Fase 9 — `AGENTS.md`

Crear `AGENTS.md` en la raíz del repo, dirigido a futuros agentes de IA que trabajen en este código. Debe incluir, como mínimo:

- Resumen de la arquitectura (el diagrama y la tabla de tecnologías de la sección 1).
- Convenciones de código del proyecto (estructura de carpetas, naming, manejo de errores en API routes, cómo se leen/validan variables de entorno).
- Cómo levantar el entorno local (`docker compose up -d`, variables requeridas, comandos de seed si existen).
- Cómo correr los tests (unitarios y E2E, ver Fase 10).
- Reglas de seguridad: nunca commitear `.env.local`, nunca loggear tokens/contraseñas, cómo se manejan las credenciales S3 (solo en servidor, nunca expuestas al cliente).
- Puntero a este mismo documento de fases, para que un agente que retome el proyecto sepa en qué fase quedó.

**Criterio de aceptación:** `AGENTS.md` existe y un agente nuevo, leyéndolo, podría levantar el proyecto y entender las convenciones sin más contexto.

### Fase 10 — Planeación y ejecución de E2E testing

Framework recomendado: **Playwright** (cubre navegación real, subida de archivos vía `<input type="file">` o interceptando el `PUT` a S3, y reproducción de `<video>`).

Casos E2E mínimos a implementar en `tests/e2e/`:

1. **Registro y login**: crear cuenta, cerrar sesión, volver a iniciar sesión.
2. **Acceso protegido**: usuario no autenticado es redirigido al intentar entrar a `/dashboard`.
3. **Subida de vídeo completa**: login → subir archivo de prueba con metadatos (nombre, tags, kv) → verificar que aparece en el listado.
4. **Búsqueda**: subir dos vídeos con tags distintos → buscar por tag → verificar que solo aparece el correcto.
5. **Reproducción**: abrir el detalle de un vídeo subido y verificar que el elemento `<video>` carga (evento `loadeddata` o similar) sin error 403/404 en la URL prefirmada.
6. **Borrado**: borrar un vídeo y verificar que desaparece del listado y ya no es accesible por su antigua URL prefirmada.
7. **Dashboard**: tras subir N vídeos de tamaño conocido, verificar que el contador y el espacio ocupado mostrados son correctos.

Configuración:

- `playwright.config.ts` con `webServer` apuntando a `npm run dev` (o `next build && next start`) y dependencia de que `docker-compose` (Mongo + RustFS) esté arriba antes de correr la suite.
- Script `npm run test:e2e` documentado en `AGENTS.md`.
- Usar una base de datos/bucket de test aislados (ej. `videovault_test`, bucket `videos-test`) para no ensuciar datos de desarrollo, o limpiar antes/después de cada corrida (`beforeAll`/`afterAll`).

**Criterio de aceptación:** `npm run test:e2e` corre localmente contra el entorno dockerizado y los 7 casos anteriores pasan en verde.

### Fase 11 — Gate: verificación 100% local

Antes de tocar CI/CD o despliegue, confirmar explícitamente:

- [ ] `docker compose up -d` levanta Mongo + RustFS sin intervención manual.
- [ ] `.env.example` documenta todas las variables necesarias y `.env.local` funciona copiándolo.
- [ ] Todas las funcionalidades de la sección 1 funcionan de punta a punta en local.
- [ ] La suite E2E completa (Fase 10) pasa en verde en local.
- [ ] `AGENTS.md` y `.env.example` están commiteados.
- [ ] No hay secretos hardcodeados en el código (buscar y confirmar).

**No continúes a la Fase 12 sin marcar todos estos puntos.** Si alguno falla, repórtalo y corrígelo antes de seguir.

### Fase 12 — Pipeline de CI/CD (GitLab CI)

Repositorio: **GitLab**. Pipeline en `.gitlab-ci.yml` con al menos estas etapas:

1. **install**: `npm ci`.
2. **lint**: `npm run lint` (y `tsc --noEmit` si aplica).
3. **test:unit**: tests unitarios (si existen módulos con lógica pura, ej. validaciones, agregaciones).
4. **test:e2e**: levantar MongoDB + RustFS como *services* de GitLab CI (o vía `docker:dind` + `docker-compose`), correr `npm run build` y `npm run test:e2e` contra ese entorno efímero.
5. **build**: `next build` (puede fusionarse con la etapa anterior si el runner lo permite).

**Sobre el deploy:** el proyecto de Vercel se conecta **directamente al repo de GitLab** (integración nativa de Vercel, configurada desde el dashboard de Vercel: Project Settings → Git). Con eso, cada push a `main` dispara un deploy en Vercel de forma automática e independiente del pipeline de GitLab CI — **no hace falta una etapa `deploy` en `.gitlab-ci.yml` ni guardar un token de Vercel como secreto**. El pipeline de GitLab CI se limita a garantizar calidad (lint + tests + E2E + build) antes de que ese push llegue a `main`; si se quiere que un pipeline en rojo bloquee el deploy, se configura en Vercel protegiendo la rama `main` (o vía "Ignored Build Step") en vez de en GitLab.

Usar variables de entorno de test definidas como **variables de CI/CD de GitLab** (Settings → CI/CD → Variables), nunca en el propio `.gitlab-ci.yml` en texto plano. Cachear `node_modules`/`~/.npm` entre corridas para acelerar el pipeline.

**Criterio de aceptación:** un push a una rama dispara lint + tests + E2E automáticamente en GitLab CI, el pipeline falla si cualquiera de esos pasos falla, y un push a `main` dispara un deploy en Vercel vía la integración nativa (sin pasos manuales).

### Fase 13 — Despliegue público

Decisiones ya tomadas (no volver a preguntar por esto):

- **App:** Vercel, servida en el dominio propio **`videovault.jpavon-tech.com`** (subdominio del dominio `jpavon-tech.com`, ya registrado y administrado en la misma cuenta de Cloudflare).
- **Repo/CI:** GitLab + GitLab CI (Fase 12). El deploy en Vercel se dispara por la **integración nativa Vercel↔GitLab**, no desde un job de `.gitlab-ci.yml`.
- **Storage en producción:** **Cloudflare R2** (no RustFS autoalojado ni VPS) — S3-compatible, capa gratuita, ya usan Cloudflare para su dominio. Se usa la **URL pública genérica de R2** (`*.r2.dev`), no un subdominio propio — más simple para un primer despliegue, y se puede migrar a un subdominio propio después sin tocar código (es solo config).
- **Base de datos en producción:** MongoDB Atlas (ya existe la cuenta/cluster).
- **DNS:** el dominio `jpavon-tech.com` vive en Cloudflare. El registro DNS que apunte `videovault.jpavon-tech.com` hacia Vercel debe quedar en modo **"DNS only" (nube gris, no proxied)** — si Cloudflare lo deja "Proxied" (nube naranja), intercepta el tráfico antes de llegar a Vercel y puede romper la emisión automática del certificado SSL de Vercel para ese subdominio.

**Antes de ejecutar esta fase, DETENTE y pregunta al usuario la siguiente metadata** (no la asumas ni la inventes):

- **Vercel**: nombre exacto del proyecto de Vercel (o confirmar que hay que crearlo) y confirmación de que el repo de GitLab ya está conectado en Project Settings → Git de Vercel (o pedir que lo conecte antes de continuar). No se necesita token de Vercel para el flujo normal.
- **Cloudflare R2**: `Account ID` de Cloudflare, un **R2 API Token** (Access Key ID + Secret Access Key) generado desde R2 → Manage R2 API Tokens con permisos de lectura/escritura sobre el bucket, y el nombre que tendrá el bucket (ej. `videovault-videos`). Confirmar si se creará el bucket manualmente en el dashboard o si el agente debe crearlo por API/CLI (`wrangler`), y confirmar que se habilitará el acceso público del bucket para poder usar su URL `*.r2.dev`.
- **MongoDB Atlas**: connection string del cluster a usar en producción, nombre de la base de datos, y confirmar que el Network Access de Atlas permite conexiones desde Vercel (Vercel usa IPs dinámicas: normalmente se permite `0.0.0.0/0` en Atlas para funciones serverless, salvo que se use Atlas Private Endpoint/VPC peering).
- **Secreto JWT de producción**: generar uno nuevo (no reutilizar el de desarrollo) y confirmar que se guardará solo como variable de entorno en Vercel.

Con esa información, ejecutar:

1. Crear/enlazar el proyecto en Vercel conectado al repo de GitLab (integración nativa: cada push a `main` despliega solo).
2. En Vercel, agregar el dominio `videovault.jpavon-tech.com` (Project Settings → Domains). Vercel indicará el registro CNAME exacto a crear.
3. En el panel DNS de Cloudflare (donde vive `jpavon-tech.com`), crear ese registro CNAME para `videovault` apuntando al valor que dio Vercel, dejando el proxy en **"DNS only" (nube gris)**. Esperar a que Vercel confirme el dominio y emita el certificado SSL automáticamente.
4. Crear el bucket en Cloudflare R2, habilitar su acceso público (URL `*.r2.dev`) y configurar su **política CORS** para permitir `PUT`/`GET` desde `https://videovault.jpavon-tech.com` — sin esto, la subida/reproducción falla en el navegador aunque las URLs prefirmadas sean correctas.
5. En Vercel, configurar las variables de entorno de producción: `MONGODB_URI` (Atlas), `MONGODB_DB`, `RUSTFS_ENDPOINT` → ahora apunta a `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `RUSTFS_ACCESS_KEY`/`RUSTFS_SECRET_KEY` → el R2 API Token, `RUSTFS_BUCKET` → el bucket de R2, `RUSTFS_REGION` → `auto` (valor que usa R2), `JWT_SECRET` (el nuevo, de producción), `JWT_EXPIRES_IN`, `NEXT_PUBLIC_APP_URL` → `https://videovault.jpavon-tech.com`. Como el cliente S3 ya está parametrizado por env vars (nota de la Fase 4), no requiere cambios de código, solo estos valores.
6. Verificar en producción el mismo checklist de la Fase 11 (registro, login, subida, búsqueda, reproducción, dashboard) contra `https://videovault.jpavon-tech.com`.
7. **Actualizar el `README.md` original ya existente en el repo** (no crear uno nuevo, no reemplazarlo por completo) añadiendo una sección "Despliegue" con: la URL pública (`https://videovault.jpavon-tech.com`), qué corre dónde (Vercel para la app, Cloudflare R2 para storage, Atlas para Mongo), y cómo se dispara un nuevo despliegue (push a `main` → integración nativa Vercel-GitLab).

**Criterio de aceptación:** `https://videovault.jpavon-tech.com` sirve la aplicación completa y funcional con certificado SSL válido (mismo checklist que en local), un push a `main` dispara un deploy automático sin pasos manuales, y el `README.md` refleja la URL y la arquitectura de despliegue reales.

---

## 3. Resumen de checkpoints (para que el agente reporte progreso)

Al final de cada fase, reporta en una sola línea: `Fase N completada ✅ — <criterio de aceptación verificado>`. Si una fase queda bloqueada por falta de información o decisión del usuario, repórtalo como `Fase N bloqueada ⛔ — <qué falta>` y detente ahí.