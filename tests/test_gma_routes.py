import pytest
from flask import Flask, session
from flask_login import login_user, UserMixin
from unittest.mock import patch
from gma.routes import gma_bp, get_gma

class MockUser(UserMixin):
    id = 1
    username = 'testuser'
    email = 'testuser@example.com'

@pytest.fixture
def app():
    app = Flask(__name__)
    app.config.update({
        "TESTING": True,
        "LOGIN_DISABLED": False,
        "WTF_CSRF_ENABLED": False,
        "SECRET_KEY": "test_secret",
        "OPENAI_API_KEY": "test_key"
    })
    app.register_blueprint(gma_bp, url_prefix='/gma')

    with app.app_context():
        yield app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def login_user(client, app):
    with client:
        with app.test_request_context():
            user = MockUser()
            login_user(user)
            session['_user_id'] = user.id
            yield client

@pytest.fixture
def mock_gma():
    with patch('gma.routes.get_gma') as mock:
        mock.return_value.handle_message.return_value = "Mocked response"
        yield mock

def test_send_message(login_user, mock_gma):
    response = login_user.post('/gma/send_message', data={'message': 'Tell me a story'})
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data
    mock_gma.return_value.handle_message.assert_called_once()

def test_send_message_unauthorized(client):
    response = client.post('/gma/send_message', data={'message': 'Test message'})
    assert response.status_code == 401

def test_test_openai(client, mock_gma):
    response = client.get('/gma/test_openai')
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data

def test_get_custom_story(login_user, mock_gma):
    response = login_user.post('/gma/get_custom_story', 
                             data={'prompt': 'Create a custom story about a hero'})
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data
    mock_gma.return_value.story_agent.get_custom_story.assert_called_once()
