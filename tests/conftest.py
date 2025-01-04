import sys
import os
import pytest
from datetime import datetime
from flask import session
from flask_login import login_user
from unittest.mock import patch

# Add the project directory to the sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), os.pardir)))

from __init__ import create_app
from models import db, User, Campaign, AgentSettings
from config import TestConfig

@pytest.fixture(scope='module')
def test_client():
    """Create a test client for the application"""
    flask_app = create_app()
    flask_app.config.from_object(TestConfig)
    
    # Create a test client using the Flask application
    with flask_app.test_client() as testing_client:
        with flask_app.app_context():
            yield testing_client

@pytest.fixture(scope='module')
def init_database(test_client):
    """Initialize test database with sample data"""
    # Create the database and tables
    db.create_all()

    # Create test user
    hashed_password = test_client.application.extensions['bcrypt'].generate_password_hash('password').decode('utf-8')
    user = User(
        username='testuser',
        email='test@example.com',
        password=hashed_password,
        created_at=datetime.utcnow()
    )
    db.session.add(user)
    db.session.commit()

    # Create test campaign
    campaign = Campaign(
        name='Test Campaign',
        user_id=user.id,
        created_at=datetime.utcnow()
    )
    db.session.add(campaign)
    db.session.commit()

    # Create agent settings for the campaign
    agent_settings = AgentSettings(
        campaign_id=campaign.id,
        settings_json={'test_setting': 'test_value'}
    )
    db.session.add(agent_settings)
    db.session.commit()

    yield db  # this is where the testing happens!

    db.session.remove()
    db.drop_all()

@pytest.fixture
def auth_client(test_client, init_database):
    """Client with authenticated user session"""
    with test_client.session_transaction() as sess:
        sess['_user_id'] = '1'  # User ID from init_database
        sess['username'] = 'testuser'
    return test_client

@pytest.fixture
def mock_msal():
    """Mock MSAL authentication"""
    with patch('msal.ConfidentialClientApplication') as mock:
        mock_client = mock.return_value
        mock_client.get_authorization_request_url.return_value = 'https://login.microsoftonline.com/fake_auth_url'
        mock_client.acquire_token_by_authorization_code.return_value = {
            'access_token': 'fake_token',
            'id_token_claims': {
                'preferred_username': 'test.user@example.com',
                'name': 'Test User'
            }
        }
        yield mock_client

@pytest.fixture
def mock_graph_api():
    """Mock Microsoft Graph API responses"""
    with patch('requests.get') as mock:
        mock.return_value.json.return_value = {
            'displayName': 'Test User',
            'mail': 'test.user@example.com',
            'userPrincipalName': 'test.user@example.com'
        }
        yield mock

@pytest.fixture
def test_user(init_database):
    """Return the test user from the database"""
    return User.query.filter_by(email='test@example.com').first()

@pytest.fixture
def test_campaign(init_database):
    """Return the test campaign from the database"""
    return Campaign.query.filter_by(name='Test Campaign').first()

def verify_auth_redirect(response, endpoint='auth.login'):
    """Helper function to verify authentication redirects"""
    assert response.status_code == 302
    assert f'/login' in response.location