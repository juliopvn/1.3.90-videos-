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
