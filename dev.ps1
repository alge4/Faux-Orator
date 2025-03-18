# Function to display help message
function Show-Help {
    Write-Host "Faux Orator Development Helper" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "Usage: .\dev.ps1 [command]" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Commands:" -ForegroundColor Green
    Write-Host "  start       - Start the development environment"
    Write-Host "  stop        - Stop the development environment"
    Write-Host "  restart     - Restart the development environment"
    Write-Host "  rebuild     - Rebuild and start the development environment"
    Write-Host "  clean       - Remove all containers, volumes, and images"
    Write-Host "  logs        - Show logs from all containers"
    Write-Host "  backend     - Run a command in the backend container"
    Write-Host "  frontend    - Run a command in the frontend container"
    Write-Host "  update-deps - Update dependencies in both containers"
    Write-Host "  help        - Show this help message"
    Write-Host ""
    Write-Host "Examples:" -ForegroundColor Yellow
    Write-Host "  .\dev.ps1 start"
    Write-Host "  .\dev.ps1 backend npm install sequelize"
    Write-Host "  .\dev.ps1 frontend npm install react-router-dom"
    Write-Host "  .\dev.ps1 logs"
}

# Check if docker-compose is installed
try {
    docker-compose --version | Out-Null
}
catch {
    Write-Host "Error: docker-compose is not installed" -ForegroundColor Red
    exit 1
}

# Set the docker-compose file
$COMPOSE_FILE = "docker-compose.dev.yml"

# Process commands
switch ($args[0]) {
    "start" {
        Write-Host "Starting development environment..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE up -d
    }
    "stop" {
        Write-Host "Stopping development environment..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE down
    }
    "restart" {
        Write-Host "Restarting development environment..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up -d
    }
    "rebuild" {
        Write-Host "Rebuilding development environment..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE down
        docker-compose -f $COMPOSE_FILE up --build -d
    }
    "clean" {
        Write-Host "Cleaning up development environment..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE down -v
        docker system prune -f
    }
    "logs" {
        Write-Host "Showing logs..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE logs -f
    }
    "backend" {
        if ($args.Count -eq 1) {
            Write-Host "Opening shell in backend container..." -ForegroundColor Cyan
            docker-compose -f $COMPOSE_FILE exec backend sh
        }
        else {
            $command = $args[1..($args.Count - 1)] -join " "
            Write-Host "Running command in backend container: $command" -ForegroundColor Cyan
            docker-compose -f $COMPOSE_FILE exec backend $command
        }
    }
    "frontend" {
        if ($args.Count -eq 1) {
            Write-Host "Opening shell in frontend container..." -ForegroundColor Cyan
            docker-compose -f $COMPOSE_FILE exec frontend sh
        }
        else {
            $command = $args[1..($args.Count - 1)] -join " "
            Write-Host "Running command in frontend container: $command" -ForegroundColor Cyan
            docker-compose -f $COMPOSE_FILE exec frontend $command
        }
    }
    "update-deps" {
        Write-Host "Updating dependencies in both containers..." -ForegroundColor Cyan
        docker-compose -f $COMPOSE_FILE exec backend npm install
        docker-compose -f $COMPOSE_FILE exec frontend npm install
    }
    default {
        Show-Help
    }
} 