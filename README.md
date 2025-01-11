# Development Setup

## Prerequisites

- Docker Desktop (latest version)
- VS Code
- Git
- WSL2 (required for Windows)

## Quick Start

### Using VS Code (Recommended)

1. Open the project in VS Code
2. Press `Ctrl + Shift + P`
3. Type "Tasks: Run Task" and select "Setup Development Environment"

### Manual Setup

```powershell
# Using PowerShell
wsl ./dev-setup/scripts/setup-dev-env.sh
```

## Making Scripts Executable (Windows)

Option 1 - Using PowerShell:

```powershell
# Set execution policy (may require admin privileges)
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser

# Give execution permissions to the scripts
icacls "dev-setup\scripts\setup-dev-env.sh" /grant:r "%USERNAME%:(RX)"
icacls "dev-setup\scripts\init-db.sh" /grant:r "%USERNAME%:(RX)"
```

Option 2 - Using WSL (Recommended):

```bash
# Navigate to your project directory in WSL
cd /mnt/c/path/to/your/project

# Set permissions
chmod +x dev-setup/scripts/*.sh
```

## What Gets Set Up

The setup script will:

1. Clean up any existing development environment
2. Verify required tools are installed
3. Create and configure Docker containers:
   - PostgreSQL database
   - [List other services]
4. Initialize the database with required schemas
5. Verify the environment is working correctly

## Troubleshooting

If you encounter issues:

1. Try running the setup script again - it's designed to be idempotent
2. Check Docker Desktop is running
3. Ensure all prerequisites are installed
4. Common issues:
   - Port conflicts: Check if ports 5432 (PostgreSQL) are already in use
   - Docker network issues: Try restarting Docker Desktop
   - WSL2 issues: Ensure WSL2 is properly installed and set as default

## Manual Reset

To completely reset your development environment:

```powershell
# Stop and remove all containers
wsl docker-compose -f dev-setup/docker/docker-compose.dev.yml down --volumes

# Then run the setup script again
wsl ./dev-setup/scripts/setup-dev-env.sh
```

## Environment Details

The development environment includes:

- PostgreSQL database (port 5432)
- [List other services and their ports]

## Configuration

Environment variables can be modified in:

- `dev-setup/docker/docker-compose.dev.yml`
- [List other configuration files]
