from datetime import datetime
from . import db

class CampaignInvite(db.Model):
    __tablename__ = 'campaign_invites'
    
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    inviter_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    invitee_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    status = db.Column(db.String(20), default='pending')
    created_at = db.Column(db.DateTime, default=datetime.utcnow) 