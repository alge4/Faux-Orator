from app.models import Campaign, User

def test_campaign_ordering(authenticated_client, init_database):
    """Test campaign ordering with favorites"""
    user = User.query.first()
    
    # Create test campaigns
    campaigns = [
        Campaign(name='C1', user_id=user.id, order_index=0, is_favorite=False),
        Campaign(name='C2', user_id=user.id, order_index=1, is_favorite=True),
        Campaign(name='C3', user_id=user.id, order_index=2, is_favorite=True)
    ]
    for c in campaigns:
        init_database.session.add(c)
    init_database.session.commit()

    # Test ordering
    response = authenticated_client.get('/')
    assert response.status_code == 200
    
    campaigns = Campaign.query.order_by(
        Campaign.is_favorite.desc(), 
        Campaign.order_index
    ).all()
    
    assert campaigns[0].is_favorite is True
    assert campaigns[1].is_favorite is True
    assert campaigns[2].is_favorite is False

def test_favorite_toggling(authenticated_client, init_database):
    """Test toggling campaign favorite status"""
    user = User.query.first()
    campaign = Campaign(name='Test', user_id=user.id)
    init_database.session.add(campaign)
    init_database.session.commit()

    response = authenticated_client.post(f'/toggle_favorite_campaign/{campaign.id}')
    assert response.status_code == 200
    data = response.get_json()
    assert data['success'] is True
    assert data['is_favorite'] is True 