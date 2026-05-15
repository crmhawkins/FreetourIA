# 🤖 Guía de Configuración de IA - FreetourIA

## 📋 Resumen

Este sistema permite cambiar fácilmente entre diferentes proveedores de IA modificando solo el archivo `.env`.

**Proveedores soportados:**
- ✅ **OpenAI (ChatGPT)** - Producción (configurado actualmente)
- ✅ **IA Local (Ollama/LM Studio)** - Para desarrollo sin costos
- ✅ **Mock Provider** - Para testing sin API keys

---

## 🚀 Configuración Actual (OpenAI)

Tu archivo `.env` está configurado para usar **OpenAI GPT-4**. Solo necesitas verificar que la API key sea válida.

### Verificar configuración

```bash
cd apps/backend
cat .env
```

Deberías ver:
```env
AI_PROVIDER=openai
OPENAI_API_KEY=sk-proj-...
OPENAI_MODEL=gpt-4
```

### Iniciar el backend

```bash
npm run start:dev
```

Verás en los logs:
```
🤖 Using OpenAI Provider
```

---

## 🔄 Cambiar a IA Local (Futuro)

### 1. Instalar Ollama

```bash
# Windows (desde https://ollama.ai)
winget install Ollama.Ollama

# Iniciar Ollama
ollama serve

# Descargar modelo
ollama pull llama2
```

### 2. Modificar `.env`

```env
# Cambiar de OpenAI a Local
AI_PROVIDER=local

# Configurar URL local
LOCAL_AI_URL=http://localhost:11434
LOCAL_AI_MODEL=llama2
```

### 3. Reiniciar backend

Verás en los logs:
```
🏠 Using Local AI Provider
   URL: http://localhost:11434
   Model: llama2
```

---

## 📝 Variables de Entorno

### AI Provider

| Variable | Valores | Descripción |
|----------|---------|-------------|
| `AI_PROVIDER` | `openai`, `local`, `ollama` | Proveedor activo |

### OpenAI Configuration

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `OPENAI_API_KEY` | `sk-proj-...` | API key de OpenAI |
| `OPENAI_MODEL` | `gpt-4`, `gpt-3.5-turbo` | Modelo a usar |
| `OPENAI_MAX_TOKENS` | `1000` | Tokens máximos por respuesta |

### Local AI Configuration

| Variable | Ejemplo | Descripción |
|----------|---------|-------------|
| `LOCAL_AI_URL` | `http://localhost:11434` | URL del servidor Ollama |
| `LOCAL_AI_MODEL` | `llama2`, `mistral` | Modelo local |

---

## 🧪 Probar el Sistema

### Endpoint de prueba

Una vez el backend esté corriendo, puedes probar la generación de contenido:

```bash
# Obtener speech para un punto de interés
curl -X GET "http://localhost:3000/points-of-interest/YOUR_POI_ID" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

Esto internamente llamará a `AiOrchestratorService.getSpeechForPOI()` que usará el provider configurado.

### Ver logs

Los providers tienen logging detallado:

```
🤖 Generating speech for Plaza de San Marco using gpt-4
✅ Speech generated successfully (342 characters)
```

---

## 🔧 Troubleshooting

### Error: "OPENAI_API_KEY is required"

Verifica que tu `.env` tenga la key:
```bash
echo $env:OPENAI_API_KEY  # PowerShell
```

### Error: "OpenAI API error 401"

La API key es inválida o expiró. Genera una nueva en https://platform.openai.com/api-keys

### No funciona Local AI

1. Verifica que Ollama esté corriendo:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Verifica que el modelo esté descargado:
   ```bash
   ollama list
   ```

---

## 📁 Archivos Importantes

### Configuración
- [`apps/backend/.env`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/.env) - Configuración activa
- [`apps/backend/.env.example`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/.env.example) - Template

### Código
- [`src/config/ai-config.service.ts`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/src/config/ai-config.service.ts) - Servicio de configuración centralizado
- [`src/modules/ai-orchestrator/providers/openai.provider.ts`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/src/modules/ai-orchestrator/providers/openai.provider.ts) - Implementación OpenAI
- [`src/modules/ai-orchestrator/providers/local-ai.provider.ts`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/src/modules/ai-orchestrator/providers/local-ai.provider.ts) - Implementación Local AI
- [`src/modules/ai-orchestrator/ai-orchestrator.module.ts`](file:///e:/proyectos/programasivan/FreetourIA/apps/backend/src/modules/ai-orchestrator/ai-orchestrator.module.ts) - Módulo con factory de providers

---

## ⚡ Ventajas del Sistema

1. **Flexibilidad**: Cambiar de provider editando solo `.env`
2. **Sin vendor lock-in**: No estás atado a OpenAI
3. **Desarrollo sin costos**: Usa IA local mientras desarrollas
4. **Testing**: Mock provider para CI/CD
5. **Producción lista**: OpenAI configurado y funcionando

---

## 🎯 Siguiente Paso

1. **Ahora**: Usar OpenAI para pruebas iniciales
2. **Desarrollo**: Cambiar a Ollama local para no gastar créditos
3. **Producción**: Volver a OpenAI o evaluar otras opciones

---

## 💡 Tips

- **Modelos OpenAI recomendados**:
  - `gpt-4` - Mejor calidad (más caro)
  - `gpt-3.5-turbo` - Más rápido y económico
  
- **Modelos locales recomendados**:
  - `llama2` - Bueno para español
  - `mistral` - Rápido y eficiente
  - `llama3` - Última versión (mejor calidad)

---

**¿Dudas?** Revisa los logs del backend, tienen información detallada sobre qué provider se está usando y posibles errores.
