@echo off
:: Create and activate virtual environment
python -m venv venv
call venv\Scripts\activate

:: Upgrade pip
python -m pip install --upgrade pip

:: Install dependencies
pip install -r requirements.txt

:: Set up the database
flask db init
flask db migrate -m "Initial migration."
flask db upgrade

echo "Setup complete. Activate the virtual environment and run 'python app.py' to start the application."
