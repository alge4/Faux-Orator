# Faux Orator

Faux Orator is a web-based AI assistant application designed to aid Dungeon Masters (DMs) of Dungeons and Dragons fifth edition. The application integrates with various AI-driven functionalities to enhance the gameplay experience.

## Prerequisites

- Python 3.8 or higher
- Windows 11 Pro (for Windows containers)
  - **Note:** Windows 11 Home users should use the `sqlite-dev` branch (TODO)
- PostgreSQL 13 or higher
- Docker Desktop
- Visual Studio Code
- Microsoft Azure Account (for OAuth2 authentication)

## System Requirements

### Windows Containers (Main Branch)
- Windows 11 Pro, Enterprise, or Education
- Hyper-V enabled
- Docker Desktop with Windows containers enabled

### Alternative Setup (Coming Soon)
For developers without Windows 11 Pro:
- SQLite-based development environment (see `sqlite-dev` branch)
- Local PostgreSQL installation
- WSL2 with Linux containers

## Setup Instructions

1. Clone the repository:

   ```bash
   git clone https://github.com/yourusername/faux-orator.git
   cd faux-orator
   ```

2. Create and activate a virtual environment:

   ```bash
   python -m venv venv
   # On Windows:
   venv\Scripts\activate
   # On Unix or MacOS:
   source venv/bin/activate
   ```

3. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

4. Set up environment variables in `.env`:

   ```bash
   # Database Configuration
   DB_USER=your_postgres_username
   DB_PASSWORD=your_postgres_password
   DB_HOST=localhost
   DB_PORT=5432
   DB_NAME=faux_orator

   # Flask Configuration
   FLASK_APP=app.py
   FLASK_ENV=development
   SECRET_KEY=your_secret_key

   # Microsoft OAuth Configuration
   MICROSOFT_CLIENT_ID=your_client_id
   MICROSOFT_CLIENT_SECRET=your_client_secret
   MICROSOFT_REDIRECT_URI=http://localhost:5000/ms_callback
   ```

5. Initialize the database:
   ```bash
   flask db upgrade
   ```

## Running Tests

1. Create a test database:

   ```bash
   createdb faux_orator_test
   ```

2. Run the test suite:

   ```bash
   # Run all tests
   pytest

   # Run with coverage report
   pytest --cov=. tests/

   # Run specific test file
   pytest tests/test_auth.py

   # Run tests with print output
   pytest -s
   ```

## Development

1. Start the development server:

   ```bash
   flask run
   ```

2. Access the application at `http://localhost:5000`

## Project Structure

```
faux-orator/
├── app.py                  # Application entry point
├── config.py              # Configuration settings
├── models.py              # Database models
├── __init__.py           # Application factory
├── auth/                 # Authentication blueprint
│   ├── __init__.py
│   ├── routes.py
│   ├── forms.py
├── main/                 # Main application blueprint
│   ├── __init__.py
│   ├── routes.py
│   ├── forms.py
├── gma/                  # Game Master Assistant blueprint
│   ├── __init__.py
│   ├── agents.py
│   ├── routes.py
├── tests/                # Test suite
│   ├── conftest.py      # Test configurations and fixtures
│   ├── test_helpers.py  # Test helper functions
│   ├── test_auth.py     # Authentication tests
│   └── ...
├── templates/            # Jinja2 templates
├── static/              # Static files (CSS, JS, images)
├── migrations/          # Database migrations
└── requirements.txt     # Project dependencies
```

## Testing

The project uses pytest for testing. Key test files:

- `tests/conftest.py`: Test fixtures and configurations
- `tests/test_helpers.py`: Helper functions for testing
- `tests/test_auth.py`: Authentication flow tests
- `tests/test_routes.py`: Route testing
- `tests/test_models.py`: Database model tests

### Test Coverage

To generate a test coverage report:

```bash
pytest --cov=. --cov-report=html tests/
```

This will create a `htmlcov` directory with a detailed coverage report.

## Contributing

1. Create a new branch for your feature
2. Write tests for new functionality
3. Ensure all tests pass
4. Submit a pull request

## Troubleshooting

### Common Issues

1. Database connection errors:

   - Verify PostgreSQL is running
   - Check database credentials in `.env`
   - Ensure database exists

2. Test failures:
   - Verify test database exists
   - Check test configuration in `config.py`
   - Ensure virtual environment is activated

### Debug Mode

To run in debug mode with VS Code:

1. Set up `launch.json` in `.vscode`
2. Use the "Python: Flask" debug configuration
3. Set breakpoints in your code
4. Press F5 to start debugging

## License

This project is licensed under the MIT License - see the LICENSE file for details.
