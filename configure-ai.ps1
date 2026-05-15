# Script to configure .env file with OpenAI API key
$envExample = "e:\proyectos\programasivan\FreetourIA\apps\backend\.env.example"
$envFile = "e:\proyectos\programasivan\FreetourIA\apps\backend\.env"
$apiKey = $env:OPENAI_API_KEY
if (-not $apiKey) { Write-Host "ERROR: Set `$env:OPENAI_API_KEY antes de ejecutar" -ForegroundColor Red; exit 1 }

Write-Host "Configuring .env file..." -ForegroundColor Cyan

# Read .env.example
$content = Get-Content $envExample -Raw

# Replace placeholder values with real configuration
$content = $content -replace 'OPENAI_API_KEY=your-openai-api-key-here', "OPENAI_API_KEY=$apiKey"
$content = $content -replace 'OPENAI_MODEL=gpt-4', 'OPENAI_MODEL=gpt-4o-mini'
$content = $content -replace 'DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/freetouria\?schema=public"', 'DATABASE_URL="postgresql://myuser:mypassword@localhost:5432/freetouria?schema=public"'

# Write to .env
$content | Set-Content $envFile -NoNewline

Write-Host ".env file configured successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "Configuration:" -ForegroundColor Yellow
Write-Host "  - AI Provider: OpenAI"
Write-Host "  - Model: gpt-4o-mini"
Write-Host "  - TTS Provider: OpenAI TTS"
Write-Host "  - TTS Model: tts-1"
Write-Host "  - TTS Voice: alloy"
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. Start Docker Desktop"
Write-Host "  2. Run: docker-compose up -d"
Write-Host "  3. Run: cd apps/backend"
Write-Host "  4. Run: npm run start:dev"
