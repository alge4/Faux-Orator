from app.models import Campaign, User

def test_campaign_creation(init_database):
    """Test campaign model"""
    user = User.query.first()
    campaign = Campaign(
        name='Test Campaign',
        user_id=user.id,
        order_index=0,
        is_favorite=False
    )
    init_database.session.add(campaign)
    init_database.session.commit()
    
    assert campaign.id is not None
    assert campaign.name == 'Test Campaign'
    assert campaign.user_id == user.id 