import pytest
from flask import Flask, session
from flask_login import login_user, UserMixin
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

def test_send_message(login_user):
    response = login_user.post('/gma/send_message', data={'message': 'Tell me a story'})
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data

def test_test_openai(client):
    response = client.get('/gma/test_openai')
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data

def test_get_custom_story(login_user):
    response = login_user.post('/gma/get_custom_story', data={'prompt': 'Create a custom story about a hero'})
    json_data = response.get_json()
    assert response.status_code == 200
    assert 'success' in json_data
    assert 'response' in json_data
