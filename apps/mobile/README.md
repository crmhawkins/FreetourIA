# FreeTour IA - Mobile App

Aplicación móvil React Native (Expo) para el sistema de guía turístico por IA.

## 🚀 Inicio Rápido

```bash
# Instalar dependencias
npm install

# Iniciar en desarrollo
npm start

# Ejecutar en Android
npm run android

# Ejecutar en iOS (solo Mac)
npm run ios
```

## 📁 Estructura

```
src/
├── screens/          # Pantallas de la app
│   ├── HomeScreen.tsx
│   ├── PreferencesScreen.tsx
│   ├── RoutesScreen.tsx
│   └── GuidanceScreen.tsx
├── services/         # Servicios (API, Location, etc.)
│   ├── apiClient.ts
│   └── locationService.ts
└── store/            # Estado global (Zustand)
    └── useStore.ts
```

## 🎯 Flujo de la App

1. **HomeScreen**: Detecta ciudad actual vía GPS
2. **PreferencesScreen**: Usuario selecciona preferencias (tipo viaje, experiencia, esfuerzo)
3. **RoutesScreen**: Muestra rutas recomendadas filtradas por ciudad
4. **GuidanceScreen**: Guiado activo (En desarrollo)

## 🔧 Servicios

### LocationService
- Solicita permisos de ubicación
- Obtiene coordenadas GPS
- Detecta ciudad mediante geocoding inverso

### API Client
- Cliente Axios configurado
- Base URL: `http://localhost:3000` (ajustar según entorno)
- Interceptor para tokens JWT

## 📦 Estado Global (Zustand)

- `user`: Usuario autenticado
- `currentCity`: Ciudad detectada
- `selectedRoute`: Ruta seleccionada
- `preferences`: Preferencias del usuario (tipo viaje, experiencia, esfuerzo)
- `language`: Idioma actual

## 📝 TODOs

- [ ] Implementar GuidanceScreen completo (mapa, brújula, audio)
- [ ] Integrar react-native-maps
- [ ] Servicio de audio (reproducción TTS)
- [ ] Cliente WebSocket para GroupSessions
- [ ] Sistema i18n (react-i18next)
- [ ] Pantalla de autenticación
- [ ] Manejo de errores mejorado
- [ ] Modo offline (caché)

## 🔐 Variables de Entorno

Crear `.env`:
```
API_BASE_URL=http://localhost:3000
```

## 📱 Permisos Requeridos

- **Location**: Para detectar ciudad y navegación GPS
- **Sensors**: Para brújula/orientación (próximamente)
- **Microphone**: Para preguntas por voz (próximamente)
