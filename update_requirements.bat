@echo off

setlocal enabledelayedexpansion

:: Function to log messages
:log
echo %1
goto :eof

:: Log starting the script
call :log "Starting update_requirements.bat"

:: Activate the virtual environment
call :log "Activating virtual environment"
call venv\Scripts\activate
if errorlevel 1 (
    call :log "Failed to activate virtual environment"
    exit /b 1
)

:: Check if pipreqs is installed
call :log "Checking if pipreqs is installed"
pip show pipreqs >nul 2>&1
if errorlevel 1 (
    call :log "pipreqs not found, installing..."
    pip install pipreqs
    if errorlevel 1 (
        call :log "Failed to install pipreqs"
        exit /b 1
    )
) else (
    call :log "pipreqs already installed"
)

:: Check for new dependencies and update the requirements.txt file
call :log "Running pipreqs to update requirements.txt"
pipreqs . --force
if errorlevel 1 (
    call :log "Failed to run pipreqs"
    exit /b 1
)

:: Create a cache file if it doesn't exist
if not exist .cache (
    call :log "Creating cache file"
    echo. > .cache
)

:: Read the cache file into a variable
set "cache="
for /f "delims=" %%i in (.cache) do (
    set "cache=!cache!%%i;"
)

:: Function to check if a package is installed and at the correct version
call :log "Checking and installing dependencies"
for /f "tokens=1,2 delims== " %%i in (requirements.txt) do (
    set "found=false"
    for %%j in (!cache!) do (
        if "%%i==%%j"=="%%i==%%j" (
            set "found=true"
            goto check_version
        )
    )
    if "!found!"=="false" (
        call :log "Checking pip for %%i"
        pip show %%i >nul 2>&1
        if errorlevel 1 (
            call :log "%%i not found, installing..."
            pip install %%i==%%j
            if errorlevel 1 (
                call :log "Failed to install %%i"
                exit /b 1
            )
            echo %%i==%%j>>.cache
        ) else (
            pip show %%i | findstr "Version: %%j" >nul 2>&1
            if errorlevel 1 (
                call :log "%%i version incorrect, updating..."
                pip install %%i==%%j
                if errorlevel 1 (
                    call :log "Failed to update %%i"
                    exit /b 1
                )
                echo %%i==%%j>>.cache
            ) else (
                call :log "%%i is already at the correct version"
            )
        )
    )
    :check_version
)

:: Start the Flask application
call :log "Starting Flask application"
python app.py run --no-debugger --no-reload
if errorlevel 1 (
    call :log "Failed to start Flask application"
    exit /b 1
)

:: Deactivate the virtual environment
call :log "Deactivating virtual environment"
deactivate
if errorlevel 1 (
    call :log "Failed to deactivate virtual environment"
    exit /b 1
)

call :log "Script completed successfully"
endlocal
