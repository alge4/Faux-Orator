from flask import session
from models import User, Campaign

def login_user(client, email='test@example.com', password='password'):
    """Helper function to log in a user"""
    return client.post('/login', 
                      data=dict(email=email, password=password),
                      follow_redirects=True)

def logout_user(client):
    """Helper function to log out a user"""
    return client.get('/logout', follow_redirects=True)

def verify_logged_in(client, username='testuser'):
    """Verify that a user is logged in"""
    with client.session_transaction() as sess:
        assert '_user_id' in sess
        assert 'username' in sess
        assert sess['username'] == username

def verify_logged_out(client):
    """Verify that a user is logged out"""
    with client.session_transaction() as sess:
        assert '_user_id' not in sess
        assert 'username' not in sess

def create_test_campaign(db, user, name="Test Campaign"):
    """Helper function to create a test campaign"""
    campaign = Campaign(name=name, user_id=user.id)
    db.session.add(campaign)
    db.session.commit()
    return campaign 