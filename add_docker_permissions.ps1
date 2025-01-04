# Must run as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] "Administrator")) {  
    Write-Warning "Please run this script as Administrator!"
    Break
}

# Add current user to docker-users group
$currentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$group = "docker-users"

try {
    # Check if group exists
    $exists = Get-LocalGroup -Name $group -ErrorAction SilentlyContinue
    if (-not $exists) {
        Write-Host "Creating docker-users group..."
        New-LocalGroup -Name $group
    }

    # Add user to group
    Add-LocalGroupMember -Group $group -Member $currentUser -ErrorAction SilentlyContinue
    Write-Host "Successfully added $currentUser to $group group"
    
    # Verify Docker service is running
    $service = Get-Service -Name "com.docker.service" -ErrorAction SilentlyContinue
    if ($service.Status -ne "Running") {
        Write-Host "Starting Docker service..."
        Start-Service "com.docker.service"
    }
    
    Write-Host "`nSetup complete! Please:"
    Write-Host "1. Restart Docker Desktop"
    Write-Host "2. Sign out and back in to Windows"
    Write-Host "3. Try running the CI task again"
} catch {
    Write-Host "Error: $_"
}

pause 