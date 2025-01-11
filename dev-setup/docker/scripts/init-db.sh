#!/bin/bash
set -e

psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" <<-EOSQL
    -- Create extensions
    CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
    CREATE EXTENSION IF NOT EXISTS "pgcrypto";

    -- Create schemas
    CREATE SCHEMA IF NOT EXISTS app;

    -- Set search path
    SET search_path TO app, public;

    -- Add any initial setup SQL here
    -- For example:
    -- CREATE TABLE users (
    --     id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    --     email TEXT UNIQUE NOT NULL,
    --     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    -- );
EOSQL 