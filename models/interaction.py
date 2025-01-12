from . import db
from datetime import datetime

class Interaction(db.Model):
    __tablename__ = 'interactions'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    type = db.Column(db.String(50), nullable=False)  # e.g., 'message', 'action', etc.
    
    # Define relationships
    user = db.relationship('User', backref=db.backref('interactions', lazy=True))
    campaign = db.relationship('Campaign', backref=db.backref('interactions', lazy=True))

    def to_dict(self):
        return {
            'id': self.id,
            'user_id': self.user_id,
            'campaign_id': self.campaign_id,
            'content': self.content,
            'created_at': self.created_at,
            'type': self.type
        }

    def __repr__(self):
        return f'<Interaction {self.id}>' 