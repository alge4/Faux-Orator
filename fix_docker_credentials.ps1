# Create Docker config directory if it doesn't exist
$dockerConfigPath = "$env:USERPROFILE\.docker"
if (-not (Test-Path $dockerConfigPath)) {
    New-Item -ItemType Directory -Path $dockerConfigPath
}

# Create or update config.json
$configContent = @{
    "credsStore" = "desktop.exe"
    "stackOrchestrator" = "swarm"
} | ConvertTo-Json

$configContent | Out-File "$dockerConfigPath\config.json" -Encoding UTF8

Write-Host "Docker config updated at: $dockerConfigPath\config.json"
Write-Host "Please restart Docker Desktop and try again." 