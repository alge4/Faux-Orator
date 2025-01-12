import subprocess
import os
import sys
from reset_db import reset_database

def rebuild_database():
    try:
        # Reset the database
        print("=== Starting database reset ===")
        reset_database()

        # Initialize migrations
        print("\n=== Initializing migrations ===")
        if os.path.exists('migrations'):
            print("Removing existing migrations folder...")
            import shutil
            shutil.rmtree('migrations')
        
        result = subprocess.run(['flask', 'db', 'init'], capture_output=True, text=True)
        if result.returncode != 0:
            print("Error initializing migrations:")
            print(result.stderr)
            return

        # Create migration
        print("\n=== Creating migration ===")
        result = subprocess.run(['flask', 'db', 'migrate', '-m', "Initial migration"], 
                              capture_output=True, text=True)
        if result.returncode != 0:
            print("Error creating migration:")
            print(result.stderr)
            return

        # Apply migration
        print("\n=== Applying migration ===")
        result = subprocess.run(['flask', 'db', 'upgrade'], capture_output=True, text=True)
        if result.returncode != 0:
            print("Error applying migration:")
            print(result.stderr)
            return

        print("\n=== Database rebuild completed successfully ===")

    except Exception as e:
        print(f"An error occurred: {str(e)}")
        sys.exit(1)

if __name__ == '__main__':
    rebuild_database() 