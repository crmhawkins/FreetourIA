# Leer el archivo pg_hba.conf completo
Write-Host "Leyendo pg_hba.conf completo..." -ForegroundColor Cyan
docker exec freetouria_db cat /var/lib/postgresql/data/pg_hba.conf
