# AGENTS.md — VideoVault

Guía para cualquier agente de IA (o persona) que retome este repositorio.
Léela antes de tocar código: te ahorra tener que releer todo el proyecto.

El documento de fases (`PROMT.md`, en la raíz) es la fuente de verdad del
plan de trabajo. Ver [Estado del proyecto](#estado-del-proyecto) al final
de este archivo para saber en qué fase se quedó y qué sigue.

---

## 1. Qué es esto

VideoVault es una plataforma de gestión de vídeos: subida directa desde el
navegador a un storage S3 (RustFS en local, Cloudflare R2 en producción),
metadatos y búsqueda en MongoDB, reproducción HTML5 y un dashboard de uso.

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
| Frontend | Next.js 16 (App Router), React 19, Tailwind v4, `context/` global |
| Backend | API Routes (`app/api/**/route.ts`) + `proxy.ts` |
| Storage | RustFS S3-compatible (`@aws-sdk/client-s3` + presigned URLs) — **en local**. En producción, **Cloudflare R2** (mismo código, solo cambian las variables de entorno) |
| Metadatos | MongoDB (driver nativo `mongodb`), BD `videovault` — **en local**. En producción, **MongoDB Atlas** |
| Auth | Registro/login con `bcryptjs` + JWT (`jose`) en cookie httpOnly |

### Principios de diseño (no los rompas sin una buena razón)

1. **URLs prefirmadas en ambos sentidos.** El servidor nunca recibe ni sirve
   el binario del vídeo: genera una URL de escritura temporal para subir
   (`PutObjectCommand`) y una de lectura temporal para reproducir
   (`GetObjectCommand`). Las credenciales S3 viven solo en el servidor
   (`lib/s3/client.ts`), nunca se exponen al cliente.
2. **Binario y metadatos separados.** Mongo solo guarda
   `{ s3Key, nombre, descripcion, tags, kv, fecha, tamaño, userId }`
   (ver `lib/db/models/video.ts`). Listar y buscar es barato porque no toca
   S3; S3 solo se usa al reproducir o al generar la URL de subida.
3. **Metadatos clave-valor libres.** Además de `tags`, cada vídeo admite un
   objeto `kv` sin esquema fijo, indexado con notación de punto
   (`kv.<clave>`) en las búsquedas.
4. **El cliente S3 está parametrizado 100% por variables de entorno**
   (`endpoint`, `region`, `forcePathStyle`, credenciales). Pasar de RustFS a
   Cloudflare R2 en producción es un cambio de configuración, no de código.

---

## 2. Convenciones de código

### Estructura de carpetas

```
app/                    App Router: páginas + app/api/**/route.ts
  api/<recurso>/route.ts        handlers GET/POST/...
  api/<recurso>/[id]/route.ts   handlers sobre un recurso concreto
components/             componentes de UI reutilizables (sin lógica de datos)
context/                contexto global de React (AuthContext)
lib/
  env.ts                único punto de lectura de variables de entorno
  auth/                 password (bcrypt), jwt (jose), session (cookies), constants
  db/                   mongodb.ts (singleton), models/ (users, videos), ensureIndexes.ts
  s3/client.ts           cliente S3/RustFS, presign, ensureBucket
  format.ts             utilidades de formato compartidas por la UI (bytes, fechas)
  validation.ts         validadores de input compartidos por las API routes
proxy.ts                protección de rutas privadas (antes "middleware.ts", ver más abajo)
instrumentation.ts      hook de arranque: crea índices de Mongo y el bucket S3
tests/e2e/              specs de Playwright + fixtures
tests/unit/             tests de lógica pura (node --test)
.gitlab-ci.yml           pipeline de CI (install/lint/test/build)
```

### Naming

- Los nombres de campo del dominio (`nombre`, `descripcion`, `tamaño`,
  `fecha`) siguen el vocabulario de `PROMT.md` tal cual, sin traducir a
  inglés — así el esquema de Mongo es legible junto a la especificación.
  El resto del código (funciones, variables, tipos) va en español o inglés
  según lo que ya exista en el archivo que estés tocando; no mezcles los
  dos estilos dentro del mismo archivo.
- Cada modelo (`lib/db/models/*.ts`) exporta su `*Document` (forma en
  Mongo, con `ObjectId`/`Date`) y su `*DTO` (forma serializada a JSON, con
  `id`/strings) más una función `to*DTO()`. No devuelvas un `*Document` tal
  cual desde una API route.

### Manejo de errores en API routes

- Cada handler valida su input a mano (ver `lib/validation.ts` para los
  validadores comunes) y responde `NextResponse.json({ error: "..." },
  { status })` con mensajes en español, orientados al usuario.
- Nunca devuelvas el objeto `Error` ni un stack trace al cliente. Si hay un
  fallo inesperado (Mongo caído, S3 caído), captúralo, haz
  `console.error("[contexto] ...", error)` y responde un mensaje genérico
  con `status: 502` o `503`.
- Autenticación: `getSessionUser()` (`lib/auth/session.ts`) devuelve
  `null` si no hay sesión válida — las rutas bajo `/api/videos/*` y
  `/api/dashboard/*` ya están protegidas por `proxy.ts`, pero cada handler
  vuelve a comprobar `getSessionUser()` por si se invoca fuera de ese
  matcher (defensa en profundidad, no confíes solo en el proxy).

### Variables de entorno

- Léelas **siempre** a través de `lib/env.ts` (`env.mongodbUri()`,
  `env.rustfsBucket()`, etc.), nunca con `process.env.X` directo en el
  resto del código. `lib/env.ts` lanza un error explícito al primer uso si
  falta una variable, en vez de fallar más adelante con un error críptico.
- Nunca hardcodees secretos. Todo lo sensible (claves, contraseñas,
  connection strings) sale de `process.env` vía `lib/env.ts`.

---

## 3. Cómo levantar el entorno local

```bash
cp .env.example .env.local        # y rellena JWT_SECRET (openssl rand -base64 32)
docker compose up -d              # MongoDB (27017) + RustFS (9001 API / 9002 consola)
npm install
npm run dev                       # http://localhost:3000
```

Al arrancar, `instrumentation.ts` crea automáticamente los índices de Mongo
y el bucket `videos` en RustFS si no existen — no hace falta ningún script
de seed manual. `GET /api/health` confirma que la app puede leer/escribir
en Mongo.

No hay script de seed de datos de ejemplo; para probar la app a mano,
regístrate desde `/register` y sube un vídeo desde `/videos/upload`.

---

## 4. Cómo correr los tests

```bash
npm run typecheck    # tsc --noEmit
npm run lint          # eslint
npm run test:unit     # node --test — lógica pura (lib/format, lib/validation, lib/auth/duration)
npm run test:e2e      # Playwright — requiere docker compose (Mongo + RustFS) arriba
npm run test:e2e:ui   # misma suite, en modo UI interactivo
```

Los tests unitarios (`tests/unit/*.test.ts`) usan el test runner nativo de
Node (`node --test`), sin dependencias extra — solo cubren módulos sin
efectos secundarios (`lib/format.ts`, `lib/validation.ts`,
`lib/auth/duration.ts`). Verás un warning de Node sobre
`MODULE_TYPELESS_PACKAGE_JSON` al correrlos: es cosmético (Node detecta el
módulo como ESM al vuelo), no toca `package.json` a propósito para no
afectar cómo Next.js/Playwright resuelven sus propios módulos.

La suite E2E (`tests/e2e/*.spec.ts`, Playwright) cubre: registro/login,
acceso protegido sin sesión, subida completa con metadatos, búsqueda por
tag, reproducción, borrado y dashboard. `playwright.config.ts` levanta
`npm run dev` automáticamente como `webServer`; solo necesitas tener Docker
arriba antes de correr la suite. No hay proyecto de test aislado
(`videovault_test` / `videos-test`): los tests limpian sus propios datos
(usuarios y vídeos con prefijo `e2e-`) en lugar de depender de una base de
datos separada — ver el comentario al principio de cada spec.

### CI (GitLab)

`.gitlab-ci.yml` corre `install -> lint -> test (unit + e2e) -> build` en
cada push. El job `test:e2e` levanta MongoDB y RustFS como *services*
efímeros y necesita dos variables de CI/CD configuradas en GitLab
(Settings -> CI/CD -> Variables, nunca en el YAML): `CI_RUSTFS_ACCESS_KEY`,
`CI_RUSTFS_SECRET_KEY` y `CI_JWT_SECRET`. El deploy a Vercel no vive en
este pipeline — ver la nota al principio de `.gitlab-ci.yml` y la Fase 12
de `PROMT.md`.

---

## 5. Reglas de seguridad

- **Nunca commitees `.env.local`** (ni ningún `.env*` real) — solo
  `.env.example` va versionado. `.gitignore` ya lo bloquea; si `git status`
  muestra `.env.local` como "para commitear", algo está mal configurado,
  no lo fuerces con `git add -f`.
- **Nunca loggees tokens, contraseñas ni cookies de sesión.** Los
  `console.error` de las API routes solo deben incluir el mensaje de error
  y contexto (p. ej. `"[presign-upload] fallo generando URL"`), nunca el
  body de la request ni headers de auth.
- **Las credenciales S3 (`RUSTFS_ACCESS_KEY`/`RUSTFS_SECRET_KEY`) solo
  existen en el servidor** (`lib/s3/client.ts`, importado únicamente desde
  `app/api/**` e `instrumentation.ts`). Nunca las pases a un componente
  cliente ni las incluyas en una respuesta JSON — lo único que cruza al
  navegador son las URLs prefirmadas ya firmadas, con expiración corta (15
  min para subir, 1 hora para reproducir).
- El JWT de sesión vive en una cookie `httpOnly`, `sameSite: "lax"`, y
  `secure` en producción (`lib/auth/session.ts`). No lo dupliques en
  `localStorage` ni lo expongas a JS del cliente.

---

## 6. Estado del proyecto

Ver `PROMT.md` para la descripción completa de cada fase.

- ✅ Fases 0–12 completadas: bootstrap, env, Mongo, auth, S3/RustFS, CRUD de
  vídeos, búsqueda, reproducción, dashboard, este documento, suite E2E
  (12/12 en verde), gate de verificación local, y `.gitlab-ci.yml`.
- ⏳ Fase 13 (despliegue público) — requiere que el humano aporte
  credenciales/decisiones (proyecto de Vercel, cuenta/bucket de Cloudflare
  R2, connection string de MongoDB Atlas, JWT de producción) antes de
  ejecutarse; no asumas esos valores, pregúntalos explícitamente.

Si vas a continuar el trabajo, corre `git log --oneline` y compáralo con
las fases de `PROMT.md`: cada fase completada tiene su propio commit con
mensaje `feat(...)` describiendo qué cubre.
