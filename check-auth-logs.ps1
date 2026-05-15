# Verificar logs de PostgreSQL para ver que metodo de autenticacion esta usando

Write-Host "Ultimos logs de autenticacion de PostgreSQL:" -ForegroundColor Cyan
docker logs freetouria_db --tail=20 | Select-String -Pattern "authentication"

Write-Host "`nVerificando pg_hba.conf actual:" -ForegroundColor Yellow
docker exec freetouria_db cat /var/lib/postgresql/data/pg_hba.conf | Select-String -Pattern "^host"
