def test_main_page(authenticated_client):
    """Test the main page loads"""
    response = authenticated_client.get('/')
    assert response.status_code == 200

def test_unauthorized_access(client):
    """Test unauthorized access redirects to login"""
    response = client.get('/')
    assert response.status_code == 302
    assert 'login' in response.location 