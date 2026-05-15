# AI Tourist Guide App - Complete Project

Un sistema completo de guía turístico impulsado por IA, construido con arquitectura modular y escalable.

## 🏗️ Arquitectura del Proyecto

```
FreetourIA/
├── apps/
│   ├── backend/          # API NestJS + PostgreSQL
│   └── mobile/           # App React Native (Expo)
├── packages/
│   └── shared/           # DTOs y tipos compartidos
└── docker-compose.yml    # PostgreSQL en Docker
```

## 🚀 Inicio Rápido

### 1. Instalar Dependencias Globales
```bash
npm install
```

### 2. Iniciar Base de Datos
```bash
# Iniciar PostgreSQL
docker-compose up -d

# Ejecutar migraciones
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

### 3. Iniciar Backend
```bash
cd apps/backend
npm run start:dev
# Backend: http://localhost:3000
```

### 4. Iniciar Mobile App
```bash
cd apps/mobile
npm start
# Escanear QR con Expo Go
```

## 📦 Stack Tecnológico

### Backend
- **Framework**: NestJS + TypeScript
- **Database**: PostgreSQL + Prisma ORM
- **Real-time**: Socket.IO (WebSockets)
- **Auth**: JWT + Passport
- **API**: REST

### Frontend
- **Framework**: React Native + Expo
- **Navigation**: React Navigation
- **State**: Zustand
- **I18n**: react-i18next
- **Location**: expo-location
- **Audio**: expo-av

### Shared
- **Types**: TypeScript DTOs compartidos
- **Build**: Compilado a CommonJS

## 🎯 Flujo de Usuario (MVP)

1. **Detección de Ciudad**: GPS → Geocoding → Ciudad actual
2. **Preferencias**: Tipo de viaje, experiencia, nivel de esfuerzo
3. **Selección de Ruta**: Lista filtrada por ciudad y preferencias
4. **Guiado Activo**:
   - 🗺️ Navegación GPS punto a punto
   - 🧭 Orientación con brújula
   - 🎧 Audio TTS generado por IA
   - 💬 Preguntas por voz/texto a IA
5. **Modo Grupo**: Sincronización en tiempo real vía WebSockets
6. **Valoración**: Rating + comentarios al finalizar

## 📊 Módulos Backend

| Módulo | Descripción | Endpoints |
|--------|-------------|-----------|
| **Auth** | JWT authentication | `/auth/register`, `/auth/login` |
| **Users** | User management | `/users/*` |
| **Routes** | Tourist routes | `/routes`, `/routes/:id` |
| **POIs** | Points of interest | `/points-of-interest` |
| **ContentEngine** | Speech caching | Servicio interno |
| **AI Orchestrator** | AI abstraction layer | Servicio interno |
| **TTS** | Text-to-Speech | Servicio interno |
| **GroupSessions** | WebSocket sync | WebSocket events |
| **Ratings** | Route ratings | `/ratings` |

## 🔌 WebSocket Events

### Client → Server
```typescript
emit('joinSession', { sessionId, userId })
emit('updatePoint', { sessionId, pointId, isHost })
emit('updateStatus', { sessionId, status, isHost })
emit('leaveSession', { sessionId, userId })
```

### Server → Client
```typescript
on('memberJoined', { userId, timestamp })
on('pointUpdated', { pointId, timestamp })
on('statusUpdated', { status, timestamp })
on('memberLeft', { userId, timestamp })
```

## 🗄️ Modelo de Datos

```prisma
User
├── id: UUID
├── email: String
├── password: String (hashed)
└── name: String?

Route
├── id: UUID
├── name: String
├── city: String
├── difficulty: String
├── estimatedDuration: Int
├── distance: Float
└── tags: String[]

PointOfInterest
├── id: UUID
├── routeId: UUID
├── orderIndex: Int
├── latitude: Float
├── longitude: Float
└── stableId: String?

ContentCache
├── id: UUID
├── pointId: UUID
├── language: String
├── experienceType: String
├── textContent: String
└── audioUrl: String?

GroupSession
├── id: UUID
├── code: String (6-char)
├── hostUserId: UUID
├── routeId: UUID
└── status: String

Rating
├── id: UUID
├── routeId: UUID
├── rating: Int (1-5)
└── comment: String?
```

## 🔧 Servicios Frontend

### LocationService
```typescript
getCurrentLocation(): Promise<{lat, lon}>
detectCity(lat, lon): Promise<string>
```

### AudioService
```typescript
playAudio(uri: string): Promise<void>
pauseAudio(): Promise<void>
stopAudio(): Promise<void>
```

### GroupSessionClient
```typescript
connect(): void
joinSession(sessionId, userId): Promise<any>
updatePoint(pointId, isHost): Promise<any>
leaveSession(userId): Promise<any>
```

### API Client
```typescript
axios.get('/routes?city=Venice')
axios.post('/auth/register', userData)
```

## 📱 Pantallas Implementadas

1. **HomeScreen**: Detección automática de ciudad
2. **PreferencesScreen**: Selección de preferencias
3. **RoutesScreen**: Lista de rutas filtradas
4. **GuidanceScreen**: Placeholder para guiado activo

## 🌐 Internacionalización

Idiomas soportados:
- 🇪🇸 Español (default)
- 🇬🇧 English

```typescript
import { useTranslation } from 'react-i18next';
const { t, i18n } = useTranslation();

// Cambiar idioma
i18n.changeLanguage('en');
```

## 🔐 Autenticación

```typescript
// Register
POST /auth/register
{ email, password, name }

// Login
POST /auth/login
{ email, password }
→ { access_token, user }

// Protected routes
Headers: { Authorization: 'Bearer <token>' }
```

## 📝 Scripts Útiles

```bash
# Backend
cd apps/backend
npm run start:dev      # Dev con hot-reload
npm run build          # Build producción
npx prisma studio      # UI de BD
npx prisma migrate dev # Nueva migración

# Mobile
cd apps/mobile
npm start              # Expo dev server
npm run android        # Android
npm run ios            # iOS (Mac only)

# Shared
cd packages/shared
npm run build          # Compilar DTOs
npm run dev            # Watch mode
```

## 🎨 Características Implementadas

✅ **Backend**
- [x] Auth JWT + Passport
- [x] CRUD Routes, POIs, Ratings
- [x] ContentEngine (cache de speeches)
- [x] AI Orchestrator (capa de abstracción)
- [x] TTS Service (capa de abstracción)
- [x] WebSocket GroupSessions
- [x] Prisma + PostgreSQL

✅ **Frontend**
- [x] Navigation Stack
- [x] Location Service (GPS + Geocoding)
- [x] Zustand Store (estado global)
- [x] Pantallas: Home, Preferences, Routes, Guidance
- [x] API Client (Axios)
- [x] i18n (es/en)
- [x] WebSocket Client
- [x] Audio Service

✅ **Shared**
- [x] DTOs compartidos
- [x] TypeScript strict mode

## 🚧 TODOs / Extensiones Futuras

### Backend
- [ ] Implementar providers reales (OpenAI, Google TTS)
- [ ] Seed data de ejemplo (rutas en Venice, Barcelona)
- [ ] Validación de DTOs (class-validator)
- [ ] Rate limiting (@nestjs/throttler)
- [ ] Tests unitarios (Jest)
- [ ] Swagger documentation
- [ ] Logging (Winston)
- [ ] Cloud storage para audios (S3/GCS)

### Frontend
- [ ] Integrar react-native-maps
- [ ] Implementar brújula (expo-sensors)
- [ ] Grabación de voz (expo-av)
- [ ] Modo offline (cache local)
- [ ] Pantalla de Login/Register
- [ ] Pantalla de Profile
- [ ] Pantalla de GroupSession
- [ ] Animaciones (react-native-reanimated)
- [ ] Push notifications

### Features Avanzadas
- [ ] Modo AR (Realidad Aumentada)
- [ ] Rutas personalizadas por usuario
- [ ] Social: fotos, comentarios públicos
- [ ] Alertas de masificación
- [ ] Recomendaciones ML

## 🐛 Troubleshooting

### Backend no compila
```bash
cd apps/backend
rm -rf node_modules dist
npm install
npm run build
```

### Mobile no encuentra módulos
```bash
cd apps/mobile
rm -rf node_modules
npm install
npx expo start -c
```

### Prisma no genera cliente
```bash
cd apps/backend
npx prisma generate
```

### WebSocket no conecta
Verificar que el backend esté corriendo y que el SOCKET_URL en `groupSessionClient.ts` sea correcto.

## 📄 Licencia

TBD

## 👨‍💻 Autor

Iván - FreeTour IA Project

---

**Estado del Proyecto**: MVP Funcional ✅
**Última actualización**: 2025-12-02
