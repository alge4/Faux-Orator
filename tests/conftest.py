import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))

import pytest
from app import create_app, db
from app.models import User, Campaign

@pytest.fixture
def app():
    app = create_app('testing')
    return app

@pytest.fixture
def client(app):
    return app.test_client()

@pytest.fixture
def init_database():
    db.create_all()
    
    # Create test user
    user = User(username='testuser', email='test@test.com')
    user.set_password('password123')
    db.session.add(user)
    db.session.commit()
    
    yield db
    db.drop_all()

@pytest.fixture
def authenticated_client(client, init_database):
    client.post('/login', data={
        'username': 'testuser',
        'password': 'password123'
    })
    return client