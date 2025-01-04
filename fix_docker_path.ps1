# Must run as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {  
    Write-Warning "Please run this script as Administrator!"
    Break
}

# Define Docker paths
$dockerPaths = @(
    "${env:ProgramFiles}\Docker\Docker\Resources\bin",
    "${env:ProgramFiles}\Docker\Docker\Resources\docker-credential-desktop.exe"
)

# Add Docker paths to system PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "Machine")
$pathsToAdd = $dockerPaths | Where-Object { $currentPath -notlike "*$_*" }

if ($pathsToAdd) {
    $newPath = $currentPath + ";" + ($pathsToAdd -join ";")
    [Environment]::SetEnvironmentVariable("Path", $newPath, "Machine")
    Write-Host "Added Docker paths to system PATH"
} else {
    Write-Host "Docker paths already in system PATH"
}

# Verify docker-credential-desktop.exe exists
$credentialPath = "${env:ProgramFiles}\Docker\Docker\Resources\bin\docker-credential-desktop.exe"
if (Test-Path $credentialPath) {
    Write-Host "Found credential helper at: $credentialPath"
} else {
    Write-Host "Credential helper not found. Attempting to repair..."
    
    # Create symbolic link if exe exists in alternative location
    $altPath = "${env:ProgramFiles}\Docker\Docker\Resources\docker-credential-desktop.exe"
    if (Test-Path $altPath) {
        New-Item -ItemType Directory -Force -Path (Split-Path $credentialPath)
        New-Item -ItemType SymbolicLink -Path $credentialPath -Target $altPath
        Write-Host "Created symbolic link to credential helper"
    } else {
        Write-Host "ERROR: Could not find docker-credential-desktop.exe"
        Write-Host "Please repair or reinstall Docker Desktop"
    }
}

Write-Host "`nPlease:"
Write-Host "1. Restart Docker Desktop"
Write-Host "2. Open a new terminal"
Write-Host "3. Try running the CI task again"

pause 