# tests/test_auth.py

def test_login_page(test_client):
    """
    Test the login page.
    """
    response = test_client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data

def test_valid_login_logout(test_client, init_database):
    """
    Test logging in and logging out.
    """
    response = test_client.post('/login', data=dict(
        email='testuser@example.com', password='testpassword'
    ), follow_redirects=True)
    assert response.status_code == 200
    assert b'Invalid credentials, please try again.' not in response.data

    response = test_client.get('/logout', follow_redirects=True)
    assert response.status_code == 200
    assert b'You have been logged out' in response.data

def test_invalid_login(test_client, init_database):
    """
    Test logging in with invalid credentials.
    """
    response = test_client.post('/login', data=dict(
        email='invalid@example.com', password='wrongpassword'
    ), follow_redirects=True)
    assert response.status_code == 200
    assert b'Invalid credentials, please try again.' in response.data
