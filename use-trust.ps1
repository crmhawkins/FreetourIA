# Cambiar a modo trust (sin contraseña) para desarrollo

Write-Host "Cambiando autenticacion a modo trust..." -ForegroundColor Cyan

docker exec freetouria_db sh -c "sed -i 's/host all all all md5/host all all all trust/' /var/lib/postgresql/data/pg_hba.conf"

Write-Host "Verificando cambio..." -ForegroundColor Yellow
docker exec freetouria_db cat /var/lib/postgresql/data/pg_hba.conf | Select-String -Pattern "^host all all all"

Write-Host "`nReiniciando PostgreSQL..." -ForegroundColor Yellow
docker restart freetouria_db

Write-Host "`nEsperando a que PostgreSQL reinicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nProbando conexion..." -ForegroundColor Cyan
Set-Location apps\backend
node test-connection.js
