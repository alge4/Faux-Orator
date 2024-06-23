# tests/conftest.py

import pytest
from app import create_app
from models import db, User
from flask_bcrypt import generate_password_hash

@pytest.fixture(scope='module')
def test_client():
    flask_app = create_app()
    flask_app.config['WTF_CSRF_ENABLED'] = False

    # Create a test client
    testing_client = flask_app.test_client()

    # Establish an application context before running the tests.
    ctx = flask_app.app_context()
    ctx.push()

    yield testing_client  # this is where the testing happens!

    ctx.pop()

@pytest.fixture(scope='module')
def init_database():
    # Create the database and the database table
    db.create_all()

    # Insert user data
    hashed_password = generate_password_hash('testpassword').decode('utf-8')
    user = User(username='testuser', email='testuser@example.com', password=hashed_password)
    db.session.add(user)
    db.session.commit()

    yield db  # this is where the testing happens!

    db.drop_all()
