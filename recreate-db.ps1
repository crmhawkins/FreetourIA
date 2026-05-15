# Script para recrear el contenedor de Docker con las credenciales correctas

Write-Host "🔄 Recreando contenedor de PostgreSQL..." -ForegroundColor Cyan

# Detener y eliminar el contenedor y volumen existentes
Write-Host "`n1️⃣ Deteniendo y eliminando contenedor existente..." -ForegroundColor Yellow
docker compose down -v

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al ejecutar 'docker compose'. Asegúrate de que Docker Desktop esté corriendo." -ForegroundColor Red
    Write-Host "   Abre Docker Desktop y espera a que esté completamente iniciado." -ForegroundColor Red
    exit 1
}

# Crear nuevo contenedor
Write-Host "`n2️⃣ Creando nuevo contenedor..." -ForegroundColor Yellow
docker compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error al crear el contenedor." -ForegroundColor Red
    exit 1
}

# Esperar a que PostgreSQL esté listo
Write-Host "`n3️⃣ Esperando a que PostgreSQL esté listo..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

# Verificar conexión
Write-Host "`n4️⃣ Verificando conexión..." -ForegroundColor Yellow
Set-Location apps\backend
node test-credentials.js

Write-Host "`n✅ Contenedor recreado. Ahora ejecuta las migraciones:" -ForegroundColor Green
Write-Host "   cd apps\backend" -ForegroundColor Cyan
Write-Host "   npx prisma migrate dev --name init" -ForegroundColor Cyan
