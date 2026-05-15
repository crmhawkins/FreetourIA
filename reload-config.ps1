# Forzar recarga de configuracion de PostgreSQL

Write-Host "Forzando recarga de pg_hba.conf..." -ForegroundColor Cyan

# Enviar señal SIGHUP para recargar configuracion
docker exec freetouria_db psql -U myuser -d freetouria -c "SELECT pg_reload_conf();"

Write-Host "`nEsperando un momento..." -ForegroundColor Yellow
Start-Sleep -Seconds 2

Write-Host "`nProbando conexion sin contraseña..." -ForegroundColor Cyan
Set-Location apps\backend
node test-no-password.js
