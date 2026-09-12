# 📹 VideoVault — Plataforma de Vídeos con Next.js + S3 + MongoDB

## 🎯 Objetivo del proyecto

Construir una plataforma de **gestión de vídeos**: subida directa desde el navegador a un storage S3 (RustFS), metadatos y búsqueda en MongoDB, reproducción HTML5 y dashboard de uso.

Con este proyecto el alumno aprende:

- **Subida client-side directa a S3** con URLs prefirmadas — el vídeo nunca pasa por el servidor Next.js.
- **Autenticación clásica** registro/login con contraseña (`bcryptjs`) y JWT (`jose`).
- Búsqueda por **metadatos flexibles**: tags, pares clave-valor, nombre y descripción.
- Reproducción de vídeo con el **reproductor HTML5** apuntando a URLs prefirmadas.

## 🏗️ Arquitectura

```
┌──────────────────────┐  PUT (presigned URL)   ┌─────────────────┐
│  Navegador           │ ─────────────────────► │  RustFS (S3)    │
│  (sube el vídeo      │                        │  bucket: videos │
│   directamente)      │  GET (presigned URL)   │  :9001          │
│                      │ ◄───────────────────── └─────────────────┘
│   ▲                  │
│   │ <video> HTML5    │   metadatos, auth      ┌─────────────────┐
│   │                  │ ─────────────────────► │  API Routes     │
└───┴──────────────────┘                        │  → MongoDB      │
                                                │   (videovault)  │
                                                └─────────────────┘
```

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 16 (App Router), React 19, Tailwind, `context/` global |
| Backend | API Routes + `middleware.ts` |
| Storage | RustFS S3 (`@aws-sdk/client-s3` + presigned URLs) |
| Metadatos | MongoDB (driver nativo), BD `videovault` |
| Auth | Registro/login con `bcryptjs` + JWT (`jose`) |

## ⚙️ Funcionalidades

- **Registro y login** de usuarios con contraseña hasheada y sesión JWT.
- **Subida de vídeos desde el cliente** directamente a RustFS; el bucket `videos` se crea si no existe.
- **Metadatos por vídeo**: nombre, descripción, fecha, tags y pares clave-valor libres.
- **Búsqueda** por tags, nombre, descripción y metadatos.
- **Reproducción** con el reproductor HTML5.
- **Dashboard** con número de vídeos subidos y espacio ocupado.

## 💡 Solución

1. **URLs prefirmadas en ambos sentidos**: para subir, el servidor genera una URL de escritura temporal y el navegador hace el `PUT` directo a S3 (el backend no traga gigas de vídeo); para reproducir, genera una URL de lectura temporal que se usa como `src` del `<video>`. Las credenciales S3 nunca salen del servidor.
2. **Binario y metadatos separados**: el vídeo vive en S3 y MongoDB solo guarda `{ s3Key, nombre, descripción, tags, kv, fecha, tamaño, userId }`. Buscar y listar es barato; S3 solo se toca al reproducir.
3. **Metadatos clave-valor libres**: además de los tags, cada vídeo admite pares arbitrarios (`proyecto: demo`, `cliente: acme`), que la búsqueda de MongoDB consulta sin necesidad de esquema fijo.
4. **Dashboard por agregación**: el espacio ocupado y el conteo salen de una pipeline de agregación sobre los tamaños guardados en los metadatos.

## 🚀 Cómo ejecutar

1. Arranca MongoDB local y RustFS en Docker.
2. Crea `.env.local`:

```env
MONGODB_URI=mongodb://localhost:27017
MONGODB_DB=videovault
RUSTFS_ENDPOINT=http://localhost:9001
RUSTFS_ACCESS_KEY=rustfsadmin
RUSTFS_SECRET_KEY=rustfsadmin
RUSTFS_BUCKET=videos
JWT_SECRET=your-secret-key-here
```

3. Instala y arranca:

```bash
npm install
npm run dev
```

4. Regístrate en [http://localhost:3000](http://localhost:3000), sube un vídeo y búscalo por tag.

## 🌐 Despliegue

**URL pública:** [https://videovault.jpavon-tech.com](https://videovault.jpavon-tech.com)

### Qué corre dónde

| Servicio | Rol |
|---|---|
| **Vercel** | Hosting de la app Next.js (build + funciones serverless de las API routes) |
| **Cloudflare R2** | Storage S3-compatible en producción (bucket `videovault-videos`), sustituye a RustFS sin cambios de código |
| **MongoDB Atlas** | Base de datos en producción, sustituye al MongoDB local |
| **Cloudflare DNS** | Resuelve `videovault.jpavon-tech.com` hacia Vercel (registro CNAME en modo "DNS only", nube gris) |

### Cómo se dispara un despliegue

El repositorio "fuente de la verdad" es **GitLab** (self-hosted), donde vive el pipeline de CI (`.gitlab-ci.yml`: install → lint → test unit/e2e → build). Como esa instancia de GitLab es self-hosted, Vercel no pudo conectarse a ella directamente para la integración nativa — así que el repo se **espeja a GitHub** vía [GitLab Push Mirroring](https://docs.gitlab.com/ee/user/project/repository/mirror/push.html) (Settings → Repository → Mirroring repositories), y es ese espejo en GitHub el que está conectado a Vercel:

```
git push (GitLab, origin/main)
        │
        ├──► GitLab CI (.gitlab-ci.yml): lint + tests + build
        │
        └──► push mirror automático ──► GitHub ──► Vercel detecta el push
                                                      y despliega solo
```

Cada `git push` a `main` en GitLab dispara el pipeline de CI y, vía el mirror, un deploy automático en Vercel — sin pasos manuales.

### Variables de entorno en producción

Configuradas en Vercel (Project Settings → Environment Variables), con los mismos nombres que en `.env.example` pero apuntando a los servicios de producción: `RUSTFS_ENDPOINT` = `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`, `RUSTFS_REGION` = `auto`, y un `JWT_SECRET` distinto al de desarrollo. Ver `.env.example` y `AGENTS.md` (sección de troubleshooting en producción) para el detalle completo.

<!-- BEGIN cc:que-se-valora -->
¡Hola! Aquí te explico qué miraremos con lupa cuando corrijamos tu proyecto de "Videos".

## 📋 Qué se valora

Nos fijaremos, **lo que más pesa**, en que tu aplicación funcione correctamente y cumpla con todo lo que se pide en el enunciado. También es **importante** que tu código esté bien escrito, sea fácil de entender y que la estructura general de tu proyecto sea sólida. El vídeo demo es **importante** porque nos ayuda a ver cómo funciona tu aplicación y qué has conseguido. Finalmente, le daremos un **peso menor** a cómo has documentado tus decisiones y el porqué de algunas elecciones que hayas hecho.

Recuerda que el enunciado del proyecto es la guía principal y la evaluación no te penalizará por cosas que no se pidan explícitamente allí.
<!-- END cc:que-se-valora -->
