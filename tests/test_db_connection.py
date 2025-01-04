import sys
import os
import pytest
from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import text

# Add the project directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from config import TestConfig
from __init__ import create_app, db

def test_database_connection():
    """Test that we can connect to the PostgreSQL database"""
    app = create_app()
    app.config.from_object(TestConfig)
    
    with app.app_context():
        try:
            # Use text() for raw SQL queries
            result = db.session.execute(text('SELECT 1')).scalar()
            assert result == 1, "Database query did not return expected result"
            print(f"Successfully connected to PostgreSQL! Test query result: {result}")
        except Exception as e:
            pytest.fail(f"Failed to connect to PostgreSQL: {e}")

if __name__ == '__main__':
    # This allows running this test directly
    test_database_connection() 