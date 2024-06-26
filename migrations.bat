@echo off
REM Check if the virtual environment is activated
if "%VIRTUAL_ENV%" == "" (
    echo Please activate your virtual environment first.
    exit /b 1
)

REM Navigate to the project directory (modify the path if necessary)
cd /d "%~dp0"

REM Ensure the database directory exists
if not exist instance mkdir instance

REM Run the database migrations
flask db init || echo Database already initialized.
flask db migrate -m "Database migration."
flask db upgrade

REM Output success message
echo Database migrations applied successfully.
pause
