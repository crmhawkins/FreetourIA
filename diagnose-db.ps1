# Script para diagnosticar el problema de PostgreSQL

Write-Host "Diagnostico de PostgreSQL" -ForegroundColor Cyan

# Verificar que el contenedor esta corriendo
Write-Host "`nVerificando estado del contenedor..." -ForegroundColor Yellow
docker ps --filter "name=freetouria_db"

# Ver los logs del contenedor
Write-Host "`nLogs del contenedor (ultimas 30 lineas):" -ForegroundColor Yellow
docker compose logs --tail=30 postgres

# Intentar conectar directamente con psql
Write-Host "`nIntentando conectar con psql dentro del contenedor..." -ForegroundColor Yellow
$query = "SELECT version();"
docker exec freetouria_db psql -U myuser -d freetouria -c $query

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nPostgreSQL esta funcionando correctamente dentro del contenedor!" -ForegroundColor Green
    Write-Host "El problema puede ser de conectividad desde el host." -ForegroundColor Yellow
} else {
    Write-Host "`nPostgreSQL no esta respondiendo dentro del contenedor." -ForegroundColor Red
}
