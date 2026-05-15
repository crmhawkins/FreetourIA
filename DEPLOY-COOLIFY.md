# Despliegue de FreeTour IA Backend en Coolify (servidor interno)

Guía paso a paso para desplegar `apps/backend` en el Coolify del servidor
**217.160.39.79** bajo el dominio **api.freetour.hawkins.es**.

Coolify detectado: **v4.0.0-beta.463** · Proxy: **Traefik v3.6**.

---

## 0. Pre-requisitos

- [ ] **DNS** — Asegúrate de tener un A record en IONOS:
      `api.freetour.hawkins.es  A  217.160.39.79` (TTL 300).
      Traefik no podrá emitir el certificado Let's Encrypt hasta que el DNS
      resuelva. Comprueba con: `nslookup api.freetour.hawkins.es` (debe
      devolver `217.160.39.79`).
- [ ] **Repositorio Git** — La aplicación NO está bajo control de versiones
      (`/.git` no existe). Tienes dos opciones:
  - **Opción A (recomendada):** `git init` en la raíz, push a un repo
    privado en `github.com/crmhawkins/FreetourIA` y conecta Coolify a
    GitHub vía GitHub App.
  - **Opción B (rápida):** Subir el código como Public Git → branch `main`
    de un fork, o usar el método "Dockerfile" con git público.
  - **Opción C (más rápida):** Comprimir `apps/backend` + `packages/shared`
    + `package.json` raíz + `package-lock.json` raíz en un `.zip` y subirlo
    en Coolify como recurso de tipo "Dockerfile" (Coolify acepta upload).

---

## 1. Crear proyecto en Coolify

1. Entra en la GUI de Coolify: `https://coolify.<tu-dominio>` (servidor 217.160.39.79).
2. **Projects → New Project** → nombre: `freetour-ia`.
3. Selecciona el entorno por defecto `production`.

---

## 2. Crear PostgreSQL dedicado

Dentro del proyecto `freetour-ia`:

1. **+ New → Database → PostgreSQL 16**.
2. Nombre: `freetour-db`.
3. Coolify generará automáticamente:
   - Usuario: `postgres` (o el que indique)
   - Password: aleatorio
   - Base de datos: `postgres`
   - Hostname interno: `<container-name>` (visible en la pestaña
     "Connection String").
4. **Cambia el nombre de la BD** a `freetouria` (opcional pero deja claro qué
   contenedor sirve qué). Click sobre el recurso → tab **Environment
   Variables** → `POSTGRES_DB=freetouria` → **Save & Restart**.
5. Anota el **connection string interno** (algo como
   `postgresql://postgres:<pwd>@freetour-db-<hash>:5432/freetouria`). Lo
   usarás como `DATABASE_URL`. NO uses el external URL: el backend correrá
   en la misma red Docker.
6. **Backups** — Activa en la tab "Backups" del recurso (recomendado a las
   03:00 UTC, retención 7 días).

---

## 3. Crear la aplicación (Application)

Dentro del mismo proyecto:

1. **+ New → Application**.
2. Tipo:
   - **Si elegiste Opción A/B:** "Public Repository" o "Private Repository
     (GitHub App)". Indica branch `main` y **Build Pack: Dockerfile**.
   - **Si elegiste Opción C:** "Dockerfile" → upload.
3. **Build Pack:** Dockerfile.
4. **Base Directory:** `/apps/backend` (importante — el Dockerfile vive ahí).
5. **Dockerfile Location:** `Dockerfile` (relativo al base dir).
6. **Port:** `3000` (lo que expone el contenedor).
7. **Save** (no deploy todavía — falta configurar vars y dominio).

---

## 4. Variables de entorno

Pestaña **Environment Variables** del Application → **Developer view (Bulk
edit)** y pega el bloque siguiente. Reemplaza `<<DATABASE_URL_DE_PASO_2>>`
por el connection string interno que copiaste.

```env
NODE_ENV=production
PORT=3000

DATABASE_URL=<<DATABASE_URL_DE_PASO_2>>

JWT_SECRET=<<GENERAR_CON: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">>

AI_PROVIDER=anthropic
ANTHROPIC_API_KEY=<<COPIAR_DE: apps/backend/.env (no commitear)>>
ANTHROPIC_MODEL=claude-sonnet-4-6
ANTHROPIC_MAX_TOKENS=1024

TTS_PROVIDER=elevenlabs
ELEVENLABS_API_KEY=<<COPIAR_DE: apps/backend/.env (no commitear)>>
ELEVENLABS_MODEL=eleven_multilingual_v2
ELEVENLABS_VOICE_ID=h2cd3gvcqTp3m65Dysk7
ELEVENLABS_AGENT_ID=agent_6801kp1hvhpnf2aawt8a01jmw4b5

STORAGE_PROVIDER=local
AUDIO_STORAGE_PATH=/app/storage/audio

ALLOWED_ORIGINS=https://api.freetour.hawkins.es,exp://expo.dev,*
```

> **Nota sobre el `*` en `ALLOWED_ORIGINS`:** las apps móviles con bundle ID
> NO envían cabecera `Origin`, por lo que el backend ya las admite sin
> necesidad del `*`. Si quieres CORS estricto, quita el `,*` final. Lo dejé
> según indicación del usuario.

Click **Save**.

---

## 5. Dominio y HTTPS

1. Pestaña **Domains** del Application.
2. **+ Add Domain** → `https://api.freetour.hawkins.es`.
3. Activa **Generate Automatic SSL** (Let's Encrypt vía Traefik).
4. Save. Traefik reescribirá su `dynamic_conf` y emitirá el cert si el DNS
   resuelve. Si falla, vuelve aquí cuando el DNS esté listo y dale **Restart
   Proxy** desde *Servers → 217.160.39.79 → Restart Proxy*.

---

## 6. Volumen persistente para audio

El backend genera archivos MP3 en `/app/storage/audio`. Sin volumen,
desaparecen tras cada redeploy.

1. Pestaña **Storages** (a veces llamada *Persistent Storage*) del
   Application.
2. **+ Add Storage**:
   - Tipo: **Volume Mount**.
   - Name: `freetour-audio`.
   - Source: deja el default (Coolify creará volumen Docker nombrado).
   - **Destination Path:** `/app/storage/audio`.
3. Save.

---

## 7. Healthcheck (opcional, ya viene del Dockerfile)

El `Dockerfile` ya incluye `HEALTHCHECK` apuntando a `http://127.0.0.1:3000/api/health`.
En Coolify, pestaña **Healthcheck** del Application:

- **Enabled:** ON.
- **Path:** `/api/health`.
- **Port:** `3000`.
- **Method:** `GET`.
- **Expected status code:** `200`.
- **Interval:** `30s` · **Timeout:** `5s` · **Retries:** `3`.

---

## 8. Deploy

1. Click **Deploy** (botón arriba a la derecha del Application).
2. Coolify clonará el repo / aceptará el zip, ejecutará el Dockerfile multi-stage,
   correrá `prisma migrate deploy` y arrancará el contenedor.
3. Sigue los logs en la pestaña **Logs** del Application.

Tiempo estimado del primer build: **~3–6 minutos** (npm install + Prisma generate + tsc).

---

## 9. Verificación post-deploy

Cuando el contenedor esté `running` y healthy:

```bash
# Healthcheck público
curl -i https://api.freetour.hawkins.es/api/health
# Esperado:  HTTP/2 200 ; { "status":"ok", ... , "services":{"database":"ok", ...} }

# Smoke test del endpoint principal
curl -i https://api.freetour.hawkins.es/
# Esperado:  { "name":"FreeTour IA API", ... }
```

Si `database` aparece como `error`, el connection string es incorrecto o el
PostgreSQL aún no ha terminado de arrancar — revisa logs del recurso DB.

---

## 10. Operaciones recurrentes

### Re-deploy tras cambios
- Si conectado a GitHub: push a `main` → Coolify lo detecta (si activaste
  Auto-Deploy) o pulsa **Deploy** manualmente.
- Si subido por zip: vuelve a subir el zip y pulsa Deploy.

### Migraciones nuevas
El `CMD` del Dockerfile ejecuta `prisma migrate deploy` en cada arranque,
así que basta con commitear las nuevas migraciones y re-desplegar.

### Logs en vivo (SSH al servidor)
```bash
ssh -i ~/.ssh/hawcert_server claude@217.160.39.79
docker logs -f <nombre-contenedor-freetour-ia>
```
El nombre del contenedor lo verás como `<app-uuid>-<timestamp>` en
`docker ps`.

### Limpieza cache desde el host (NUNCA como root sobre /app)
Si necesitas ejecutar `prisma` u otro comando dentro del contenedor:
```bash
docker exec -u appuser <contenedor> node_modules/.bin/prisma migrate status
```
**No uses `-u root`** — corromperás los permisos del volumen de audio.

---

## 11. Rollback

Pestaña **Deployments** del Application → localiza el deployment anterior
estable → **Redeploy this version**.

---

## 12. Bloqueadores conocidos / decisiones pendientes para el usuario

1. **Repositorio Git** — Decide entre Opción A (GitHub privado, ideal para
   auto-deploy y rollback por commit), B o C antes de iniciar el paso 3.
2. **DNS** — Crea el A record `api.freetour.hawkins.es → 217.160.39.79` en
   IONOS. Sin esto, el certificado Let's Encrypt fallará.
3. **CORS estricto vs. permisivo** — Decide si dejas el `*` en
   `ALLOWED_ORIGINS` (permite cualquier web app desde el navegador) o lo
   quitas (recomendado en producción si solo te conectas desde app móvil).
4. **WebSockets** — El backend usa `@nestjs/platform-socket.io`. Traefik en
   Coolify soporta WS automáticamente sobre el mismo dominio si la app
   está bien expuesta. No necesitas configuración extra, pero verifica
   funcionalidad tras el deploy si la app móvil usa rooms en tiempo real.
5. **Storage de audios** — Está local (Volume Mount). Si el tráfico crece,
   considera migrar a S3 (`STORAGE_PROVIDER=s3` ya soportado a nivel
   variable; código S3 puede estar pendiente de implementar — verifícalo).
6. **Backups de DB** — Activa los snapshots automáticos del recurso
   PostgreSQL desde Coolify (pestaña Backups del recurso DB).

---

## Anexo · Cambios aplicados al código (resumen)

| Archivo | Cambio |
|---|---|
| `apps/backend/package.json` | `start:prod` → `node dist/src/main` (era `node dist/main`, roto). Eliminada dep no usada `@ai-tourist-guide/shared`. |
| `apps/backend/Dockerfile` | `CMD` apunta a `dist/src/main`. Build acepta ausencia de lockfile (workspace monorepo). Añadido `HEALTHCHECK`. |
| `apps/backend/.dockerignore` | Nuevo. Evita copiar `node_modules`, `dist`, `.env`, tests al build context. |
| `apps/backend/src/main.ts` | CORS ahora honra `*` en `ALLOWED_ORIGINS` (allow-any). |
| `DEPLOY-COOLIFY.md` | Este archivo. |
