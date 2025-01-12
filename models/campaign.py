from datetime import datetime
from . import db

# Association table for campaign players
campaign_players = db.Table('campaign_players',
    db.Column('user_id', db.Integer, db.ForeignKey('users.id'), primary_key=True),
    db.Column('campaign_id', db.Integer, db.ForeignKey('campaigns.id'), primary_key=True),
    db.Column('joined_at', db.DateTime, default=datetime.utcnow)
)

class Campaign(db.Model):
    """Database model for campaigns."""
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    order_index = db.Column(db.Integer, default=0)
    is_favorite = db.Column(db.Boolean, default=False)

    # Relationships - consolidated players relationship
    players = db.relationship('User', 
                            secondary=campaign_players,
                            lazy='dynamic',
                            overlaps="joined_campaigns")
    characters = db.relationship('Character', 
                               backref=db.backref('associated_campaign', lazy=True),
                               lazy=True)
    voice_channels = db.relationship('VoiceChannel', 
                                   backref=db.backref('associated_campaign', lazy=True),
                                   lazy=True)
    # The interactions relationship is defined in the Interaction model

    def __repr__(self):
        return f"<Campaign {self.name}>" 

    def initialize_default_channels(self):
        """Create default voice channels for a new campaign"""
        from models import VoiceChannel  # Import here to avoid circular imports
        
        default_channels = [
            {'name': 'Game', 'order_index': 0},
            {'name': 'Whisper', 'order_index': 1}
        ]

        for channel_data in default_channels:
            channel = VoiceChannel(
                campaign_id=self.id,
                name=channel_data['name'],
                order_index=channel_data['order_index']
            )
            db.session.add(channel)
        
        db.session.commit() 

    def to_dict(self):
        return {
            'id': self.id,
            'name': self.name,
            'created_at': self.created_at,
            'user_id': self.user_id,
            'order_index': self.order_index,
            'is_favorite': self.is_favorite
        } 