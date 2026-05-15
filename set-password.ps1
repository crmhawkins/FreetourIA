# Establecer la contraseña manualmente para el usuario myuser

Write-Host "Estableciendo contraseña para el usuario myuser..." -ForegroundColor Cyan

docker exec freetouria_db psql -U myuser -d freetouria -c "ALTER USER myuser WITH PASSWORD 'mypassword';"

if ($LASTEXITCODE -eq 0) {
    Write-Host "`nContraseña establecida correctamente!" -ForegroundColor Green
    
    Write-Host "`nProbando conexion..." -ForegroundColor Yellow
    Set-Location apps\backend
    node test-connection.js
}
else {
    Write-Host "`nError al establecer la contraseña" -ForegroundColor Red
}
