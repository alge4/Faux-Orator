#!/bin/bash

# Replace environment variables in the JavaScript files
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|REACT_APP_AZURE_CLIENT_ID|'${REACT_APP_AZURE_CLIENT_ID}'|g' {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|REACT_APP_AZURE_TENANT_ID|'${REACT_APP_AZURE_TENANT_ID}'|g' {} \;
find /usr/share/nginx/html -type f -name "*.js" -exec sed -i 's|REACT_APP_API_URL|'${REACT_APP_API_URL}'|g' {} \;

echo "Environment variables replaced" 