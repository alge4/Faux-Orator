from datetime import datetime
from . import db

class VoiceChannel(db.Model):
    __tablename__ = 'voice_channels'
    
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', backref='voice_channels')
    active_users = db.relationship('User', 
                                 secondary='voice_channel_users',
                                 backref='active_voice_channels')

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'campaign_id': self.campaign_id,
            'order_index': self.order_index,
            'active_users': [user.id for user in self.active_users]
        }

class VoiceChannelUser(db.Model):
    __tablename__ = 'voice_channel_users'
    
    channel_id = db.Column(db.Integer, db.ForeignKey('voice_channels.id'), primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), primary_key=True)
    joined_at = db.Column(db.DateTime, default=datetime.utcnow)
    is_speaking = db.Column(db.Boolean, default=False)
    is_muted = db.Column(db.Boolean, default=False) 