from . import db
from datetime import datetime

class Character(db.Model):
    __tablename__ = 'characters'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Define relationships without backrefs
    user = db.relationship('User', foreign_keys=[user_id])

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'campaign_id': self.campaign_id,
            'user_id': self.user_id,
            'created_at': self.created_at
        } 