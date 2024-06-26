# Faux Orator

Faux Orator is a web-based AI assistant application designed to aid Dungeon Masters (DMs) of Dungeons and Dragons fifth edition. The application integrates with various AI-driven functionalities to enhance the gameplay experience.

## Project Structure

```
your_project/
├── app.py
├── config.py
├── models.py
├── init.py
├── auth/
│ ├── init.py
│ ├── routes.py
│ ├── forms.py
│ ├── email.py
├── main/
│ ├── init.py
│ ├── routes.py
│ ├── forms.py
├── gma/
│ ├── init.py
│ ├── agents.py
│ ├── routes.py
├── templates/
│ ├── index.html
│ ├── login.html
│ ├── main.html
│ ├── planning.html
│ ├── playing.html
│ ├── review.html
├── static/
│ ├── css/
│ ├── js/
│ ├── img/
├── instance/
│ ├── users.db
├── .env
├── update_requirements.bat
├── .vscode/
│ ├── tasks.json
│ ├── launch.json
```

## Setup Instructions

### Prerequisites

Python 3.8 or higher
pip (Python package installer)
Visual Studio Code
Initial Setup
Clone the repository:

```
git clone https://github.com/yourusername/faux-orator.git
cd faux-orator
```

Create a virtual environment:

```
python -m venv venv
```

Activate the virtual environment:

```
venv\Scripts\activate
```

Install dependencies:

```
pip install -r requirements.txt
```

Set up the environment variables:

Create a .env file in the root directory and add the following:

```
SECRET_KEY=your_secret_key
MAIL_SERVER=smtp.example.com
MAIL_PORT=587
MAIL_USE_TLS=True
MAIL_USERNAME=your_email@example.com
MAIL_PASSWORD=your_email_password
```

Initialize the database:

```
flask db init
flask db migrate -m "Initial migration."
flask db upgrade
```

Running the Application
Activate the virtual environment:

```
venv\Scripts\activate
```

Run the application:

```
python app.py
```

Access the application:

Open your web browser and navigate to http://127.0.0.1:5000.

## Automating Setup with VS Code

To automate the setup and running process, you can use the provided VS Code tasks and launch configurations.

Open VS Code.

Ensure the virtual environment is activated and dependencies are installed:

Run the Update and Install Dependencies task from the VS Code Task Runner (Ctrl+Shift+B).
Run the Flask application:

Use the Debug panel to start the Python: Flask configuration (Ctrl+Shift+D).
Checking and Updating Dependencies
The update_requirements.bat script helps ensure dependencies are up to date. It checks for and installs missing dependencies and updates requirements.txt.

update_requirements.bat

## Contributing

Fork the repository
Create a new branch (git checkout -b feature-branch)
Commit your changes (git commit -am 'Add new feature')
Push to the branch (git push origin feature-branch)
Create a new Pull Request

## License

This project is exclusively licensed to the owner. Unauthorized copying, distribution, or modification of this project is strictly prohibited.
