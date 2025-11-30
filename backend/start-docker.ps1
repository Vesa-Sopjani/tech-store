# start-docker.ps1 - Docker Setup
Write-Host "🐳 Building and Starting Tech Store with Docker..." -ForegroundColor Green

# Check if Docker is running
try {
    docker version | Out-Null
} catch {
    Write-Host "❌ Docker is not running. Please start Docker Desktop first." -ForegroundColor Red
    exit 1
}

Write-Host "📦 Building Docker images..." -ForegroundColor Yellow
docker compose build

Write-Host "🚀 Starting all services..." -ForegroundColor Yellow
docker compose up -d

Write-Host "⏳ Waiting for services to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 15

Write-Host "✅ Tech Store is starting up!" -ForegroundColor Green
Write-Host ""
Write-Host "🌐 Access Points:" -ForegroundColor Cyan
Write-Host "   API Gateway: http://localhost:3000" -ForegroundColor White
Write-Host "   Kafka UI:    http://localhost:8080" -ForegroundColor White
Write-Host "   MySQL:       localhost:3306" -ForegroundColor White
Write-Host "   Redis:       localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "📊 Service Status:" -ForegroundColor Cyan
docker compose ps
Write-Host ""
Write-Host "📋 Logs: docker compose logs -f [service-name]" -ForegroundColor Gray
Write-Host "🛑 Stop: docker compose down" -ForegroundColor Gray