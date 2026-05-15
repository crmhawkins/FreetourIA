# Verificar configuracion de autenticacion de PostgreSQL

Write-Host "Verificando pg_hba.conf..." -ForegroundColor Cyan
docker exec freetouria_db cat /var/lib/postgresql/data/pg_hba.conf | Select-String -Pattern "^[^#]" | Select-String -Pattern "\S"

Write-Host "`nProbando conexion con psql desde el contenedor usando TCP..." -ForegroundColor Cyan
docker exec freetouria_db psql -h localhost -U myuser -d freetouria -c "SELECT 1;"
