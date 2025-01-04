import pytest
from flask import url_for, session
from models import User, Campaign
from unittest.mock import patch, MagicMock
from test_helpers import verify_logged_in, verify_logged_out

def test_login_page(test_client):
    """Test the login page loads correctly"""
    response = test_client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data
    assert b'Register' in response.data
    assert b'Login with Microsoft' in response.data

def test_valid_login_logout(test_client, init_database):
    """Test successful login and logout flow"""
    # Test login
    response = test_client.post('/login', 
        data=dict(email='test@example.com', password='password'), 
        follow_redirects=True)
    assert response.status_code == 200
    assert b'You have been logged in!' in response.data
    assert b'Welcome' in response.data
    
    # Verify session
    with test_client.session_transaction() as session:
        assert 'username' in session
        assert session['username'] == 'testuser'
    
    # Test logout
    response = test_client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
    assert b'You have been logged out.' in response.data
    
    # Verify session cleared
    with test_client.session_transaction() as session:
        assert 'username' not in session

def test_invalid_login_attempts(test_client, init_database):
    """Test various invalid login scenarios"""
    # Wrong password
    response = test_client.post('/login',
        data=dict(email='test@example.com', password='wrongpass'),
        follow_redirects=True)
    assert b'Invalid credentials' in response.data

    # Non-existent user
    response = test_client.post('/login',
        data=dict(email='nonexistent@example.com', password='password'),
        follow_redirects=True)
    assert b'Invalid credentials' in response.data

    # Empty fields
    response = test_client.post('/login',
        data=dict(email='', password=''),
        follow_redirects=True)
    assert b'This field is required' in response.data

@patch('requests.get')
@patch('msal.ConfidentialClientApplication')
def test_microsoft_login(mock_msal, mock_requests, test_client):
    """Test Microsoft OAuth login flow"""
    # Mock MSAL client
    mock_client = MagicMock()
    mock_msal.return_value = mock_client
    mock_client.get_authorization_request_url.return_value = 'https://login.microsoftonline.com/auth'
    
    # Test initial Microsoft login redirect
    response = test_client.get('/ms_login', follow_redirects=False)
    assert response.status_code == 302
    assert 'login.microsoftonline.com' in response.location

    # Mock token acquisition
    mock_client.acquire_token_by_authorization_code.return_value = {
        'access_token': 'fake_token'
    }
    
    # Mock Microsoft Graph API response
    mock_requests.return_value.json.return_value = {
        'displayName': 'Test User',
        'mail': 'test.user@example.com'
    }
    
    # Test callback
    response = test_client.get('/ms_callback?code=fake_code', follow_redirects=True)
    assert response.status_code == 200
    assert b'Welcome' in response.data

def test_protected_routes(test_client):
    """Test access to protected routes when not logged in"""
    routes = ['/main', '/planning', '/playing', '/perpend']
    for route in routes:
        response = test_client.get(route, follow_redirects=True)
        assert response.status_code == 200
        assert b'Please log in to access this page' in response.data

def test_already_logged_in_redirect(test_client, init_database):
    """Test redirect when accessing login/register while already logged in"""
    # Login first
    test_client.post('/login', 
        data=dict(email='test@example.com', password='password'),
        follow_redirects=True)
    
    # Try accessing login and register pages
    for route in ['/login', '/register']:
        response = test_client.get(route, follow_redirects=True)
        assert response.status_code == 200
        assert b'Welcome' in response.data  # Should be redirected to main page

def test_microsoft_login_flow(test_client, mock_msal, mock_graph_api):
    """Test complete Microsoft login flow"""
    # Initial redirect to Microsoft
    response = test_client.get('/ms_login')
    assert response.status_code == 302
    assert 'login.microsoftonline.com' in response.location

    # Simulate callback from Microsoft
    response = test_client.get('/ms_callback?code=fake_code', follow_redirects=True)
    assert response.status_code == 200
    verify_logged_in(test_client, 'Test User')

def test_protected_routes_with_auth(auth_client, test_campaign):
    """Test accessing protected routes when authenticated"""
    response = auth_client.get(f'/campaign/{test_campaign.id}')
    assert response.status_code == 200
    assert b'Test Campaign' in response.data
