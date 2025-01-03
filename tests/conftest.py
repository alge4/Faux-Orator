import sys
import os
import pytest

# Add the project directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from __init__ import create_app
from models import db, User
from config import TestConfig

@pytest.fixture(scope='module')
def test_client():
    flask_app = create_app()

    flask_app.config.from_object(TestConfig)
    testing_client = flask_app.test_client()

    # Establish an application context before running the tests.
    ctx = flask_app.app_context()
    ctx.push()

    yield testing_client  # this is where the testing happens!

    ctx.pop()

@pytest.fixture(scope='module')
def init_database():
    # Create the database and the database table(s)
    db.create_all()

    # Insert user data
    user = User(username='testuser', email='test@example.com', password='password')
    db.session.add(user)
    db.session.commit()

    yield db  # this is where the testing happens!

    db.drop_all()

@pytest.fixture
def login_user(client):
    """Fixture to login a test user"""
    with client.session_transaction() as session:
        session['user_id'] = 1
    return client

# Update test files to use the fixture correctly:
def test_send_message(client, login_user):
    # Use the logged-in client
    response = login_user.post('/gma/send_message', data={'message': 'Test message'})
    assert response.status_code == 200