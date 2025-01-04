# Function to handle Docker login/logout
function Initialize-DockerAuth {
    param (
        [Parameter(Mandatory=$true)]
        [string]$Username,
        [Parameter(Mandatory=$true)]
        [string]$Token
    )
    
    try {
        Write-Host "Attempting Docker login..." -ForegroundColor Yellow
        $Token | docker login --username $Username --password-stdin 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker login failed"
        }
        Write-Host "Docker login successful" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Docker login failed: $_" -ForegroundColor Red
        return $false
    }
}

function Clear-DockerAuth {
    try {
        Write-Host "Logging out from Docker..." -ForegroundColor Yellow
        docker logout 2>&1
        if ($LASTEXITCODE -ne 0) {
            throw "Docker logout failed"
        }
        Write-Host "Docker logout successful" -ForegroundColor Green
    }
    catch {
        Write-Host "Docker logout failed: $_" -ForegroundColor Red
    }
}

# Load environment variables
if (Test-Path .env) {
    Get-Content .env | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        if ($name -and $value) {
            Set-Item -Path "env:$name" -Value $value.Trim('"')
        }
    }
}

# Ensure required environment variables exist
if (-not $env:DOCKER_USERNAME -or -not $env:DOCKER_TOKEN) {
    Write-Host "Error: DOCKER_USERNAME and DOCKER_TOKEN must be set in .env file" -ForegroundColor Red
    exit 1
}

# Function to ensure Linux containers
function Switch-ToLinuxContainers {
    try {
        Write-Host "Checking Docker container mode..." -ForegroundColor Yellow
        
        # Get current context
        $info = docker version --format '{{.Server.Os}}'
        
        if ($info -like "*windows*") {
            Write-Host "Currently in Windows container mode. Please:" -ForegroundColor Red
            Write-Host "1. Right-click Docker Desktop icon in system tray" -ForegroundColor Yellow
            Write-Host "2. Select 'Switch to Linux containers...'" -ForegroundColor Yellow
            Write-Host "3. Wait for Docker to restart" -ForegroundColor Yellow
            Write-Host "4. Run this script again" -ForegroundColor Yellow
            return $false
        }
        
        Write-Host "Docker is in Linux container mode" -ForegroundColor Green
        return $true
    }
    catch {
        Write-Host "Error checking Docker mode: $_" -ForegroundColor Red
        return $false
    }
}

try {
    # Check Docker mode first
    if (-not (Switch-ToLinuxContainers)) {
        exit 1
    }

    # Initialize Docker authentication
    if (-not (Initialize-DockerAuth -Username $env:DOCKER_USERNAME -Token $env:DOCKER_TOKEN)) {
        throw "Failed to initialize Docker authentication"
    }

    # Clean up any existing containers
    Write-Host "`nCleaning up existing containers..." -ForegroundColor Yellow
    docker ps -a | Select-String "postgres" | ForEach-Object {
        $containerId = $_.ToString().Split()[0]
        docker stop $containerId
        docker rm $containerId
    }

    # Create a Docker network for PostgreSQL
    Write-Host "`nCreating Docker network..." -ForegroundColor Green
    docker network create postgres-net 2>$null

    # Pull and run PostgreSQL
    Write-Host "`nPulling PostgreSQL image..." -ForegroundColor Green
    docker pull postgres:13

    Write-Host "`nStarting PostgreSQL container..." -ForegroundColor Green
    docker run -d --name test-postgres `
        --network postgres-net `
        -e POSTGRES_USER=postgres `
        -e POSTGRES_PASSWORD=postgres `
        -e POSTGRES_DB=faux_orator_test `
        -p 5432:5432 `
        postgres:13

    # Wait for PostgreSQL to be ready
    Write-Host "`nWaiting for PostgreSQL to be ready..." -ForegroundColor Yellow
    $maxAttempts = 30
    $attempt = 0
    do {
        $attempt++
        Write-Host "Attempt $attempt of $maxAttempts..."
        $health = docker inspect --format='{{.State.Health.Status}}' test-postgres 2>$null
        if ($health -eq "healthy") {
            Write-Host "PostgreSQL is ready!" -ForegroundColor Green
            break
        }
        Start-Sleep -Seconds 2
    } while ($attempt -lt $maxAttempts)

    # Show container logs
    Write-Host "`nContainer logs:" -ForegroundColor Green
    docker logs test-postgres

    # Test connection
    Write-Host "`nTesting database connection..." -ForegroundColor Yellow
    docker exec test-postgres pg_isready -U postgres
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "PostgreSQL is running and accepting connections!" -ForegroundColor Green
    } else {
        throw "PostgreSQL is not responding"
    }
}
catch {
    Write-Host "Error: $_" -ForegroundColor Red
}
finally {
    # Always attempt to clean up
    Clear-DockerAuth
} 