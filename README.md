# Faux Orator

Faux Orator is a web-based AI assistant application designed to aid Dungeon Masters (DMs) of Dungeons and Dragons fifth edition. The application integrates with Discord to listen to a server's audio, identify player characters and the Dungeon Master via roles, and provide various AI-driven functionalities to enhance the gameplay experience.

## Project Structure

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
│ ├── ai.py
│ ├── routes.py
├── templates/
│ ├── index.html
│ ├── login.html
│ ├── register.html
│ ├── reset_password.html
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
└── .env

## Setup Instructions

### Prerequisites

- Python 3.8 or higher
- pip (Python package installer)

### Initial Setup

1. **Clone the repository**:

   ```bash
   git clone https://github.com/yourusername/faux-orator.git
   cd faux-orator
   ```

2. **Create a virtual environment**:

   ```bash
   python -m venv venv
   ```

3. **Activate the virtual environment**:

   ```cmd
   venv\Scripts\activate
   ```

4. **Install dependencies**:

   ```cmd
   pip install -r requirements.txt
   ```

5. **Set up the environment variables**:

   Create a `.env` file in the root directory and add the following:

   ```ini
   SECRET_KEY=your_secret_key
   MAIL_SERVER=smtp.example.com
   MAIL_PORT=587
   MAIL_USE_TLS=True
   MAIL_USERNAME=your_email@example.com
   MAIL_PASSWORD=your_email_password
   ```

6. **Initialize the database**:

   ```cmd
   flask db init
   flask db migrate -m "Initial migration."
   flask db upgrade
   ```

### Running the Application

1. **Activate the virtual environment**:

   ```cmd
   venv\Scripts\activate
   ```

2. **Run the application**:

   ```cmd
   python app.py
   ```

3. **Access the application**:

   Open your web browser and navigate to `http://127.0.0.1:5000`.

### Installing Dependencies from `requirements.txt`

If you need to ensure all dependencies listed in `requirements.txt` are installed, run:

```cmd
pip install -r requirements.txt
```

# Automatic Setup

Run:
setup_project.bat

# Contributing

Fork the repository
Create a new branch (git checkout -b feature-branch)
Commit your changes (git commit -am 'Add new feature')
Push to the branch (git push origin feature-branch)
Create a new Pull Request

# License

This project is exclusively licensed to the owner. Unauthorized copying, distribution, or modification of this project is strictly prohibited.

```
This `README.md` file provides clear instructions on how to set up and run the Faux Orator project on a Windows system. It includes steps for creating and activating a virtual environment, installing dependencies, setting up environment variables, initializing the database, and running the application. Additionally, it provides a sample script for automating the setup process and outlines the contribution guidelines. The license section specifies that the project is exclusively licensed to the owner.
```
