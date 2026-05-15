# FreeTour IA - Guía de Inicio Rápido

## ⚡ Setup en 5 Minutos

### 1️⃣ Clonar e Instalar
```bash
cd e:\proyectos\programasivan\FreetourIA
npm install
```

### 2️⃣ Configurar IA (OpenAI)
```powershell
# Configurar automáticamente OpenAI
.\configure-ai.ps1
```
✅ Esto configura:
- OpenAI API Key para generación de contenido
- OpenAI TTS para síntesis de voz
- Variables de entorno necesarias

### 3️⃣ Base de Datos
```bash
# Iniciar PostgreSQL (requiere Docker Desktop)
docker-compose up -d

# Migrar base de datos
cd apps/backend
npx prisma migrate dev --name init
npx prisma generate
```

### 4️⃣ Backend
```bash
cd apps/backend
npm run start:dev
```
✅ Backend: http://localhost:3000

### 5️⃣ Mobile
```bash
cd apps/mobile
npm start
```
✅ Escanea el QR con Expo Go

## 🤖 Probar Configuración de IA

### Verificar Configuración
```bash
curl http://localhost:3000/ai-test/config
```

### Generar Contenido con IA
```bash
curl -X POST http://localhost:3000/ai-test/generate-speech \
  -H "Content-Type: application/json" \
  -d '{"pointName":"Plaza de San Marcos","city":"Venice","language":"es"}'
```

### Generar Audio con TTS
```bash
curl -X POST http://localhost:3000/ai-test/generate-audio \
  -H "Content-Type: application/json" \
  -d '{"text":"Bienvenidos a Venecia","language":"es"}'
```

📖 Ver [AI-TESTING-GUIDE.md](./AI-TESTING-GUIDE.md) para más detalles

## 🧪 Testing del Flujo

### Probar Backend
```bash
# Health check
curl http://localhost:3000

# Register
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123","name":"Test User"}'

# Login
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@test.com","password":"test123"}'
```

### Crear Datos de Prueba
```bash
cd apps/backend
npx prisma studio
# Crear manualmente:
# 1. Una ruta en "Venice"
# 2. 2-3 puntos de interés para esa ruta
```

### Probar Mobile
1. Abrir en Expo Go
2. Permitir permisos de ubicación
3. Ver ciudad detectada
4. Seleccionar preferencias
5. Ver lista de rutas

## 🔧 Comandos Útiles

### Backend
```bash
# Ver logs de Prisma
npx prisma studio

# Resetear BD
npx prisma migrate reset

# Generar cliente
npx prisma generate

# Build
npm run build
```

### Mobile
```bash
# Limpiar cache
npx expo start -c

# Android
npm run android

# iOS (Mac only)
npm run ios
```

### Shared
```bash
cd packages/shared
npm run build
```

## 📁 Archivos Importantes

```
apps/backend/
├── prisma/schema.prisma    # Modelo de datos
├── src/modules/             # Módulos funcionales
└── .env                     # Variables de entorno

apps/mobile/
├── App.tsx                  # Entry point
├── src/screens/             # Pantallas
├── src/services/            # API, Location, etc.
└── src/store/               # Zustand store

packages/shared/
└── src/dtos.ts              # DTOs compartidos
```

## ❓ Problemas Comunes

### "Cannot find module '@ai-tourist-guide/shared'"
```bash
cd packages/shared
npm run build
cd ../../
npm install
```

### Backend no inicia
```bash
# Verificar PostgreSQL
docker ps

# Verificar .env
cat apps/backend/.env

# Reinstalar
cd apps/backend
rm -rf node_modules
npm install
```

### Mobile: "Network request failed"
- Verificar que el backend esté corriendo
- Cambiar `localhost` por IP local en `apiClient.ts`
- En Android: `adb reverse tcp:3000 tcp:3000`

## 🎯 Próximos Pasos

1. **Crear datos de ejemplo** en Prisma Studio
2. **Implementar providers reales** (OpenAI, Google TTS)
3. **Integrar mapas** en GuidanceScreen
4. **Probar WebSocket** con 2+ dispositivos

## 📚 Más Documentación

- [README Principal](./README.md)
- [Backend README](./apps/backend/README.md)
- [Mobile README](./apps/mobile/README.md)
- [Walkthrough](/.gemini/antigravity/brain/91c50aa4-d010-4c57-87df-a1e5e44ee8d1/walkthrough.md)
