#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo "🚀 Starting development environment setup..."

cleanup_existing() {
    echo -e "${YELLOW}Cleaning up existing development environment...${NC}"
    
    # Stop and remove existing containers
    docker-compose -f dev-setup/docker/docker-compose.dev.yml down --remove-orphans
    
    # Remove existing development network
    docker network rm dev-network 2>/dev/null || true
    
    echo -e "${GREEN}✓ Cleanup complete${NC}"
}

# ... [previous check_requirements, setup_docker, init_database functions] ...

main() {
    cleanup_existing
    check_requirements
    setup_docker
    init_database
    verify_env
    
    echo -e "${GREEN}✅ Development environment setup completed successfully!${NC}"
    echo "You can now start developing. Happy coding! 🎉"
}

main 