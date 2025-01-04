@echo off
echo Setting up PostgreSQL database...

REM Activate virtual environment
call venv\Scripts\activate

REM Set Flask environment variables
set FLASK_APP=app.py
set FLASK_ENV=development

REM Create database if it doesn't exist
psql -U postgres -c "CREATE DATABASE faux_orator;" || echo Database might already exist.

REM Initialize migrations if not already initialized
if not exist "migrations" (
    flask db init
)

REM Create and apply migrations
flask db migrate -m "Initialize database with User and Campaign models"
flask db upgrade

echo Database setup complete!
pause 