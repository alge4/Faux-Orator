import psycopg2
from psycopg2.extensions import ISOLATION_LEVEL_AUTOCOMMIT
import os
import shutil
import sys
from dotenv import load_dotenv

# Add parent directory to Python path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Load environment variables
load_dotenv()

def reset_database():
    # Get database connection details from environment variables
    user = os.getenv('DB_USER')
    password = os.getenv('DB_PASSWORD')
    host = os.getenv('DB_HOST')
    port = os.getenv('DB_PORT', 5432)  # Default to 5432 if not specified
    db_name = os.getenv('DB_NAME')

    print(f"Connecting to PostgreSQL to reset database {db_name}...")
    print(f"Host: {host}, Port: {port}, User: {user}")
    
    # Connect to PostgreSQL without specific database (connect to postgres db)
    try:
        conn = psycopg2.connect(
            dbname='postgres',
            user=user,
            password=password,
            host=host,
            port=port
        )
        conn.set_isolation_level(ISOLATION_LEVEL_AUTOCOMMIT)
        cur = conn.cursor()

        try:
            # Terminate all connections to the database
            print("Terminating existing connections...")
            cur.execute(f"""
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '{db_name}'
                AND pid <> pg_backend_pid();
            """)

            # Drop database if it exists
            print(f"Dropping database {db_name} if it exists...")
            cur.execute(f"DROP DATABASE IF EXISTS {db_name}")
            print(f"Dropped database {db_name}")

            # Create new database
            print(f"Creating new database {db_name}...")
            cur.execute(f"CREATE DATABASE {db_name}")
            print(f"Created new database {db_name}")

        finally:
            cur.close()
            conn.close()

        # Remove migrations folder if it exists
        if os.path.exists('migrations'):
            print("Removing migrations folder...")
            shutil.rmtree('migrations')
            print("Removed migrations folder")

    except Exception as e:
        print(f"Database connection error: {str(e)}")
        print("\nPlease verify your database settings:")
        print(f"Host: {host}")
        print(f"Port: {port}")
        print(f"User: {user}")
        print(f"Database: {db_name}")
        sys.exit(1)

if __name__ == '__main__':
    reset_database() 