# Verificar las credenciales exactas del contenedor

Write-Host "Verificando variables de entorno del contenedor..." -ForegroundColor Cyan

docker exec freetouria_db env | Select-String "POSTGRES"

Write-Host "`nIntentando listar usuarios de PostgreSQL..." -ForegroundColor Cyan
docker exec freetouria_db psql -U postgres -c "\du"
