# Create a directory in your user profile
$actDir = "$env:USERPROFILE\tools\act"
New-Item -ItemType Directory -Force -Path $actDir

# Download the latest release
$releases = Invoke-RestMethod -Uri "https://api.github.com/repos/nektos/act/releases/latest"
$asset = $releases.assets | Where-Object { $_.name -like "*Windows_x86_64.zip" }
$downloadUrl = $asset.browser_download_url

Write-Host "Downloading from: $downloadUrl" -ForegroundColor Green
$zipPath = "$actDir\act.zip"
Invoke-WebRequest -Uri $downloadUrl -OutFile $zipPath

# Extract the zip
Expand-Archive -Path $zipPath -DestinationPath $actDir -Force
Remove-Item $zipPath

# Add to user PATH
$userPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notlike "*$actDir*") {
    [Environment]::SetEnvironmentVariable("Path", "$userPath;$actDir", "User")
}

# Refresh current session PATH
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "Installation complete. Act is installed at: $actDir" -ForegroundColor Green
Write-Host "Please restart your terminal and try 'act --version'" -ForegroundColor Yellow 