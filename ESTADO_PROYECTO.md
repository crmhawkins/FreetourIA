# FreetourIA — Estado del Proyecto
**Última actualización:** 2026-04-07

---

## 🟢 Estado General: CÓDIGO AL 100% — Pendiente configuración de producción

El proyecto está **completamente implementado y listo para publicar**, una vez configuradas las credenciales externas.

---

## Stack Técnico

| Capa | Tecnología | Versión |
|------|-----------|---------|
| Mobile | React Native + Expo | 0.81.5 / ~54 |
| State | Zustand | v5 |
| Navigation | React Navigation (Stack + Tabs) | v7 |
| Backend | NestJS | v11 |
| ORM | Prisma | v6 |
| Base de datos | PostgreSQL | 15 |
| AI | OpenAI GPT-4o-mini | SDK v6 |
| TTS | OpenAI TTS (tts-1) | — |
| Auth | JWT (7 días) + bcrypt | — |
| WebSockets | Socket.io | v4.8 |
| Build mobile | EAS (Expo Application Services) | — |
| Contenedor | Docker multi-stage (Node 20 Alpine) | — |

---

## Estructura del Proyecto

```
FreetourIA/
├── apps/
│   ├── mobile/                  # React Native app
│   │   ├── src/
│   │   │   ├── screens/         # 7 pantallas completas
│   │   │   │   ├── OnboardingScreen.tsx  OK - Animado, 3 slides
│   │   │   │   ├── LoginScreen.tsx       OK - Login/Register, strength bar
│   │   │   │   ├── HomeScreen.tsx        OK - Hero azul + bottom card
│   │   │   │   ├── PreferencesScreen.tsx OK - Progress bar, step badges
│   │   │   │   ├── RoutesScreen.tsx      OK - Busqueda, filtros, offline
│   │   │   │   ├── GuidanceScreen.tsx    OK - Mapa 50% + panel IA + Q&A
│   │   │   │   └── ProfileScreen.tsx     OK - Avatar ring, badge, stats
│   │   │   ├── services/
│   │   │   │   ├── apiClient.ts          OK - JWT interceptor, 401->logout
│   │   │   │   ├── audioService.ts       OK - expo-av playback
│   │   │   │   ├── locationService.ts    OK - expo-location + geocoding
│   │   │   │   ├── offlineService.ts     OK - AsyncStorage offline routes
│   │   │   │   └── shareService.ts       OK - expo-sharing
│   │   │   ├── store/
│   │   │   │   └── useStore.ts           OK - Zustand + AsyncStorage persist
│   │   │   ├── theme/
│   │   │   │   └── theme.ts              OK - Light/Dark themes
│   │   │   ├── components/
│   │   │   │   ├── ErrorBoundary.tsx     OK
│   │   │   │   ├── NetworkBanner.tsx     OK
│   │   │   │   └── RatingModal.tsx       OK
│   │   │   └── i18n/                     OK - ES/EN/FR/DE/IT
│   │   ├── App.tsx              OK - Stack + Tabs navigator, dark mode
│   │   ├── app.json             OK - iOS/Android configs, permisos
│   │   └── eas.json             OK - Build profiles (dev/preview/production)
│   │
│   └── backend/                 # NestJS API
│       ├── src/
│       │   ├── main.ts          OK - Helmet, CORS, throttle, static audio
│       │   ├── app.module.ts    OK - Todos los modulos
│       │   └── modules/
│       │       ├── auth/        OK - JWT + Passport
│       │       ├── users/       OK - CRUD + bcrypt
│       │       ├── routes/      OK - Paginacion, filtrado por ciudad
│       │       ├── poi/         OK - Points of Interest
│       │       ├── ai-orchestrator/ OK - Speech + Q&A + cache
│       │       ├── tts/         OK - OpenAI TTS, archivos locales
│       │       ├── content-engine/  OK - Cache multilingual
│       │       ├── group-sessions/  OK - WebSockets tiempo real
│       │       ├── ratings/     OK - 1-5 estrellas
│       │       └── tour-history/    OK - Historial de tours
│       ├── prisma/
│       │   ├── schema.prisma    OK - 7 tablas, indices, FK cascade
│       │   ├── seed.ts          OK - Demo: 5 rutas (Madrid/Barcelona/Roma)
│       │   └── migrations/      OK - 2 migraciones
│       └── Dockerfile           OK - Multi-stage, non-root user
├── docker-compose.yml           OK
└── packages/shared/             OK - Tipos compartidos
```

---

## Bugs Corregidos (sesiones anteriores)

| Bug | Descripcion | Estado |
|-----|------------|--------|
| Navegacion post-login | Navegaba a 'Home' (tab) en vez de 'MainTabs' (stack) | FIXED |
| Password strength multilingue | Comparaba strings traducidos vs hardcoded | FIXED (score numerico) |
| Audio no reproducia | URL relativa sin SERVER_BASE_URL | FIXED |
| 401 partial logout | Limpiaba AsyncStorage pero Zustand seguia con user | FIXED (logout()) |
| Offline delete inconsistency | Solo borraba de useStore, no de offlineService | FIXED (doble delete) |
| Dockerfile builder faltaba TS | npm ci --only=production en builder | FIXED |
| Migracion incompleta | Faltaba isPublished, TourHistory, CASCADE deletes | FIXED |
| Audio no servido | Faltaba app.useStaticAssets() en main.ts | FIXED (NestExpressApplication) |

---

## Mejoras UX aplicadas (2026-04-07)

### HomeScreen — Rediseno completo
- Hero header azul con circulos decorativos
- Bottom card blanca con esquinas redondeadas (estilo Airbnb)
- Animacion de pulso durante deteccion de ciudad
- Estados visuales: brujula inicial / radar detectando / aviso error
- CTAs: "Explorar rutas ->" + "Ver todas las rutas" (outline)
- Feature pills: Audio IA / Offline / Grupos
- useTheme() completo para dark mode + SafeAreaView para notch

### PreferencesScreen — Progreso animado
- Barra de progreso 0/3 -> 3/3 con texto contextual dinamico
- Step badges 1/2/3 que se convierten en checkmark al completar
- Option cards con checkmark, hint, y animacion de escala al pulsar
- Effort cards con descripcion de distancia
- CTA dinamico segun progreso

### ProfileScreen — Header premium
- Circulos decorativos de profundidad
- Avatar ring con borde semitransparente
- Badge "Explorador activo"

### GuidanceScreen — Pulido profesional
- Drag handle en ambos paneles (overview + active)
- Barra de progreso del tour (2/7)
- Iconos en stats con divisores verticales
- Badge de distancia al POI
- Completion screen con decoraciones, stats row, botones diferenciados
  - Oro: Valorar / Outline: Compartir / Solido: Volver

### App.tsx — Tab bar mejorada
- Icono activo mas grande (24px vs 21px)
- Punto azul indicador bajo tab activo
- Sombra sutil superior

---

## CHECKLIST PARA PUBLICAR

### CRITICO - hacer ANTES de cualquier deployment

- [ ] Cambiar OPENAI_API_KEY en apps/backend/.env por una nueva key valida
      (la key antigua fue rotada por filtración accidental)
- [ ] Cambiar JWT_SECRET por string aleatorio 32+ chars:
      node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
- [ ] Cambiar DATABASE_URL con credenciales reales de produccion
- [ ] Anadir NODE_ENV=production en backend .env

### ANTES DE PUBLICAR EN STORES

- [ ] Google Maps API Key iOS -> app.json -> ios.config.googleMapsApiKey
- [ ] Google Maps API Key Android -> app.json -> android.config.googleMaps.apiKey
- [ ] EAS Project ID -> expo.dev -> poner en app.json -> extra.eas.projectId
- [ ] Apple Developer Account:
      eas.json -> submit.production.ios.appleId
      eas.json -> submit.production.ios.ascAppId
      eas.json -> submit.production.ios.appleTeamId
- [ ] Google Play:
      eas.json -> submit.production.android.serviceAccountKeyPath
- [ ] URL de produccion -> apps/mobile/.env -> EXPO_PUBLIC_API_URL
- [ ] CORS en produccion -> apps/backend/src/main.ts -> allowedOrigins
- [ ] PostgreSQL de produccion (Railway, RDS, Supabase...)
- [ ] Ejecutar migraciones: npm run db:migrate:deploy

### RECOMENDADO

- [ ] Probar en dispositivo real iOS y Android
- [ ] eas build --profile production --platform all
- [ ] Anadir rutas reales a la BD (mas alla del seed)
- [ ] Privacy Policy y Terms of Service (obligatorio para stores)
- [ ] Error tracking (Sentry)

---

## Como arrancar en desarrollo

```bash
# Terminal 1: Base de datos
docker-compose up -d postgres

# Terminal 2: Backend
cd apps/backend
npm install
npx prisma migrate dev
npx prisma db seed
npm run start:dev

# Terminal 3: Mobile
cd apps/mobile
npm install
npx expo start
# Escanear QR con Expo Go en el movil
```

---

## Datos de demo (seed)

- Usuario: demo@freetour.ai / Demo1234
- Rutas disponibles:
  - Madrid - Centro Historico de Madrid (5 POIs)
  - Madrid - Triangulo del Arte (4 POIs)
  - Barcelona - Gaudi Essencial (5 POIs)
  - Barcelona - El Barrio Gotico (4 POIs)
  - Roma - Roma Clasica (4 POIs)

---

## Servicios externos necesarios

| Servicio | Proposito | URL |
|----------|-----------|-----|
| OpenAI | GPT-4o-mini + TTS | https://platform.openai.com |
| Expo EAS | Build + OTA updates | https://expo.dev |
| Apple Developer | iOS distribution | https://developer.apple.com |
| Google Play Console | Android distribution | https://play.google.com/console |
| Google Cloud | Maps SDK + Geocoding | https://console.cloud.google.com |
| PostgreSQL prod | Base de datos | Railway/RDS/Supabase |

---

## Arquitectura

```
Mobile (Expo RN)
  Onboarding -> Login -> [Home | Routes | Profile]
                      -> Preferences -> Routes
                      -> GuidanceScreen
        |
        | HTTP Axios + Socket.io WS
        |
Backend (NestJS)
  /api/auth  /api/routes  /api/ai  /audio/
  JWT Auth - Throttling - Helmet - CORS
        |
        | Prisma ORM
        |
PostgreSQL
  Users - Routes - POIs - ContentCache - TourHistory - Ratings - GroupSessions
```
