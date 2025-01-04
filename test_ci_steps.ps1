# Test Docker and PostgreSQL setup
Write-Host "Step 1: Testing Docker..." -ForegroundColor Green
docker --version
if ($LASTEXITCODE -ne 0) {
    Write-Host "Docker not running or not accessible" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 2: Pulling PostgreSQL image..." -ForegroundColor Green
docker pull stellirin/postgres-windows:13
if ($LASTEXITCODE -ne 0) {
    Write-Host "Failed to pull PostgreSQL image" -ForegroundColor Red
    exit 1
}

Write-Host "`nStep 3: Starting PostgreSQL container..." -ForegroundColor Green
docker run -d --name test-postgres `
    -e POSTGRES_USER=postgres `
    -e POSTGRES_PASSWORD=postgres `
    -e POSTGRES_DB=faux_orator_test `
    -p 5432:5432 `
    stellirin/postgres-windows:13

Write-Host "`nStep 4: Waiting for PostgreSQL to start..." -ForegroundColor Green
Start-Sleep -Seconds 30
docker logs test-postgres

Write-Host "`nStep 5: Testing PostgreSQL connection..." -ForegroundColor Green
$env:PGPASSWORD = "postgres"
psql -h localhost -U postgres -d faux_orator_test -c "SELECT 1;"

Write-Host "`nStep 6: Cleanup..." -ForegroundColor Green
docker stop test-postgres
docker rm test-postgres 