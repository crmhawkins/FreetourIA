# Modificar pg_hba.conf para permitir conexiones externas con md5

Write-Host "Modificando configuracion de autenticacion..." -ForegroundColor Cyan

# Cambiar la ultima linea de scram-sha-256 a md5
docker exec freetouria_db sh -c "sed -i 's/host all all all scram-sha-256/host all all all md5/' /var/lib/postgresql/data/pg_hba.conf"

Write-Host "Verificando cambio..." -ForegroundColor Yellow
docker exec freetouria_db cat /var/lib/postgresql/data/pg_hba.conf | Select-String -Pattern "^host all all all"

Write-Host "`nReiniciando PostgreSQL..." -ForegroundColor Yellow
docker restart freetouria_db

Write-Host "`nEsperando a que PostgreSQL reinicie..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

Write-Host "`nProbando conexion..." -ForegroundColor Cyan
Set-Location apps\backend
node test-connection.js
