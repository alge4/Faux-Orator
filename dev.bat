@echo off
setlocal enabledelayedexpansion

set COMPOSE_FILE=docker-compose.dev.yml

if "%1"=="" goto help
if "%1"=="help" goto help

if "%1"=="start" (
    echo Starting development environment...
    docker-compose -f %COMPOSE_FILE% up -d
    goto end
)

if "%1"=="stop" (
    echo Stopping development environment...
    docker-compose -f %COMPOSE_FILE% down
    goto end
)

if "%1"=="restart" (
    echo Restarting development environment...
    docker-compose -f %COMPOSE_FILE% down
    docker-compose -f %COMPOSE_FILE% up -d
    goto end
)

if "%1"=="rebuild" (
    echo Rebuilding development environment...
    docker-compose -f %COMPOSE_FILE% down
    docker-compose -f %COMPOSE_FILE% up --build -d
    goto end
)

if "%1"=="clean" (
    echo Cleaning up development environment...
    docker-compose -f %COMPOSE_FILE% down -v
    docker system prune -f
    goto end
)

if "%1"=="logs" (
    echo Showing logs...
    docker-compose -f %COMPOSE_FILE% logs -f
    goto end
)

if "%1"=="backend" (
    if "%2"=="" (
        echo Opening shell in backend container...
        docker-compose -f %COMPOSE_FILE% exec backend sh
    ) else (
        set command=%*
        set command=!command:backend =!
        echo Running command in backend container: !command!
        docker-compose -f %COMPOSE_FILE% exec backend !command!
    )
    goto end
)

if "%1"=="frontend" (
    if "%2"=="" (
        echo Opening shell in frontend container...
        docker-compose -f %COMPOSE_FILE% exec frontend sh
    ) else (
        set command=%*
        set command=!command:frontend =!
        echo Running command in frontend container: !command!
        docker-compose -f %COMPOSE_FILE% exec frontend !command!
    )
    goto end
)

if "%1"=="update-deps" (
    echo Updating dependencies in both containers...
    docker-compose -f %COMPOSE_FILE% exec backend npm install
    docker-compose -f %COMPOSE_FILE% exec frontend npm install
    goto end
)

:help
echo Faux Orator Development Helper
echo.
echo Usage: dev.bat [command]
echo.
echo Commands:
echo   start       - Start the development environment
echo   stop        - Stop the development environment
echo   restart     - Restart the development environment
echo   rebuild     - Rebuild and start the development environment
echo   clean       - Remove all containers, volumes, and images
echo   logs        - Show logs from all containers
echo   backend     - Run a command in the backend container
echo   frontend    - Run a command in the frontend container
echo   update-deps - Update dependencies in both containers
echo   help        - Show this help message
echo.
echo Examples:
echo   dev.bat start
echo   dev.bat backend npm install sequelize
echo   dev.bat frontend npm install react-router-dom
echo   dev.bat logs

:end
endlocal 