import pytest
from flask import url_for

def test_login_page(test_client):
    """
    GIVEN a Flask application
    WHEN the '/login' page is requested (GET)
    THEN check that the response is valid
    """
    response = test_client.get('/login')
    assert response.status_code == 200
    assert b'Login' in response.data
    assert b'Register' in response.data

def test_valid_login_logout(test_client, init_database):
    """
    GIVEN a Flask application
    WHEN the '/login' page is posted to (POST) with valid credentials
    THEN check the response is valid and user is logged in
    """
    response = test_client.post('/login', data=dict(email='test@example.com', password='password'), follow_redirects=True)
    print(response.data.decode())  # Print full response for debugging
    assert response.status_code == 200
    assert b'You have been logged in!' in response.data or b'success' in response.data
    assert b'Logout' in response.data

    """
    GIVEN a Flask application
    WHEN the '/logout' page is requested (GET)
    THEN check the response is valid and user is logged out
    """
    response = test_client.get('/logout', follow_redirects=True)
    print(response.data.decode())  # Print full response for debugging
    assert response.status_code == 200
    assert b'You have been logged out.' in response.data or b'success' in response.data

def test_invalid_login(test_client, init_database):
    """
    GIVEN a Flask application
    WHEN the '/login' page is posted to (POST) with invalid credentials
    THEN check the response indicates invalid login attempt
    """
    response = test_client.post('/login', data=dict(email='wrong@example.com', password='wrongpassword'), follow_redirects=True)
    print(response.data.decode())  # Print full response for debugging
    assert response.status_code == 200
    assert b'Invalid credentials, please try again.' in response.data or b'danger' in response.data
