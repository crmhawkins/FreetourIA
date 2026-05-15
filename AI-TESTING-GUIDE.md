# Guía de Testing - Configuración de IA

Esta guía te ayudará a probar la configuración de OpenAI para generación de contenido y síntesis de voz.

## Prerequisitos

1. **Docker Desktop debe estar corriendo**
   - Abre Docker Desktop manualmente
   - Espera a que el ícono se ponga verde

2. **Base de datos PostgreSQL**
   ```powershell
   # Iniciar PostgreSQL
   docker-compose up -d
   
   # Verificar que está corriendo
   docker ps
   ```

3. **Configuración de variables de entorno**
   - ✅ Ya configurado con `configure-ai.ps1`
   - El archivo `.env` ya contiene tu API key de OpenAI

## Pasos de Testing

### 1. Iniciar el Backend

```powershell
cd apps/backend
npm run start:dev
```

Deberías ver en los logs:
```
🤖 Using OpenAI Provider
🎙️ Using OpenAI TTS Provider
```

### 2. Verificar Configuración

```powershell
# En otra terminal
curl http://localhost:3000/ai-test/config
```

Respuesta esperada:
```json
{
  "aiProvider": "openai",
  "ttsProvider": "openai",
  "openai": {
    "configured": true,
    "keyPreview": "sk-proj--0x...",
    "model": "gpt-4o-mini",
    "maxTokens": 1000,
    "ttsModel": "tts-1",
    "ttsVoice": "alloy"
  },
  "storage": {
    "provider": "local",
    "audioPath": "./storage/audio"
  }
}
```

### 3. Probar Generación de Contenido

```powershell
curl -X POST http://localhost:3000/ai-test/generate-speech `
  -H "Content-Type: application/json" `
  -d '{\"pointName\":\"Plaza de San Marcos\",\"city\":\"Venice\",\"language\":\"es\",\"experienceType\":\"CLASSIC\"}'
```

Respuesta esperada:
```json
{
  "success": true,
  "data": {
    "text": "Bienvenidos a la Plaza de San Marcos...",
    "cached": false
  }
}
```

### 4. Probar Generación de Audio

```powershell
curl -X POST http://localhost:3000/ai-test/generate-audio `
  -H "Content-Type: application/json" `
  -d '{\"text\":\"Bienvenidos a la Plaza de San Marcos, el corazón de Venecia\",\"language\":\"es\"}'
```

Respuesta esperada:
```json
{
  "success": true,
  "audioUrl": "/audio/tts_1735819200000_es.mp3"
}
```

El archivo de audio se guardará en `apps/backend/storage/audio/`

### 5. Probar Respuesta a Preguntas

```powershell
curl -X POST http://localhost:3000/ai-test/answer-question `
  -H "Content-Type: application/json" `
  -d '{\"question\":\"¿Cuándo se construyó?\",\"pointName\":\"Plaza de San Marcos\",\"city\":\"Venice\",\"language\":\"es\"}'
```

### 6. Obtener Voces Disponibles

```powershell
curl http://localhost:3000/ai-test/voices
```

Respuesta esperada:
```json
{
  "success": true,
  "voices": ["alloy", "echo", "fable", "onyx", "nova", "shimmer"]
}
```

## Verificación de Archivos de Audio

Los archivos de audio generados se guardan en:
```
apps/backend/storage/audio/tts_<timestamp>_<language>.mp3
```

Puedes reproducirlos con cualquier reproductor de audio.

## Troubleshooting

### Error: "Docker is not running"
- Abre Docker Desktop manualmente
- Espera a que esté completamente iniciado

### Error: "OPENAI_API_KEY is required"
- Verifica que el archivo `.env` existe en `apps/backend/`
- Ejecuta nuevamente `configure-ai.ps1`

### Error: "Authentication failed"
- Verifica que la API key de OpenAI es válida
- Comprueba que no ha expirado

### Error: "Cannot connect to database"
- Ejecuta `docker-compose up -d`
- Verifica con `docker ps` que PostgreSQL está corriendo
- Ejecuta las migraciones: `npx prisma migrate dev`

## Próximos Pasos

Una vez que todas las pruebas pasen:
1. ✅ La configuración de IA está completa
2. ✅ Puedes integrar estos servicios en las rutas reales
3. ✅ Crear datos de prueba (seed data)
4. ✅ Probar la aplicación móvil con contenido real generado por IA
