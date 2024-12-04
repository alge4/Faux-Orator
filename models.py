# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from flask_bcrypt import Bcrypt
from dataclasses import dataclass
from typing import Dict

db = SQLAlchemy()
bcrypt = Bcrypt()

@dataclass
class VoxSettings:
    debug_enabled: bool = False
    log_level: str = 'ERROR'  # DEBUG, INFO, WARNING, ERROR

class User(UserMixin, db.Model):
    """Database model for users."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(150), unique=True, nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    favorite_campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'))
    settings = db.Column(db.JSON, default=lambda: VoxSettings().to_dict())

    # Relationships
    campaigns = db.relationship('Campaign', back_populates='owner', lazy=True)
    speech_logs = db.relationship('SpeechLog', back_populates='user', lazy=True)

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if 'password' in kwargs:
            self.password = bcrypt.generate_password_hash(kwargs['password']).decode('utf-8')
        if 'settings' not in kwargs:
            self.settings = VoxSettings().to_dict()
        self.set_default_campaign()

    def set_default_campaign(self):
        """Set a default campaign for new users."""
        if self.favorite_campaign_id is None:
            default_campaign = Campaign(name='Lost Mines of Phandelver', owner=self)
            db.session.add(default_campaign)
            db.session.commit()
            self.favorite_campaign_id = default_campaign.id
            db.session.commit()

    def get_id(self):
        return self.id

    def __repr__(self):
        return f"<User {self.username}>"

    def get_vox_settings(self) -> VoxSettings:
        """Get Vox Communis settings"""
        return VoxSettings(**self.settings.get('vox', {}))

    def update_vox_settings(self, debug_enabled: bool = None, log_level: str = None):
        """Update Vox Communis settings"""
        settings = self.settings or {}
        vox_settings = settings.get('vox', {})
        
        if debug_enabled is not None:
            vox_settings['debug_enabled'] = debug_enabled
        if log_level is not None:
            vox_settings['log_level'] = log_level
            
        settings['vox'] = vox_settings
        self.settings = settings
        db.session.commit()

class Campaign(db.Model):
    """Database model for campaigns."""
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    order = db.Column(db.Integer, default=0)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relationships
    owner = db.relationship('User', back_populates='campaigns')
    interactions = db.relationship('Interaction', back_populates='campaign', lazy=True)
    agent_settings = db.relationship('AgentSettings', back_populates='campaign', cascade='all, delete-orphan')
    discord_logs = db.relationship('DiscordLog', back_populates='campaign', lazy=True)
    speech_logs = db.relationship('SpeechLog', back_populates='campaign', lazy=True)

    def __repr__(self):
        return f"<Campaign {self.name}>"

class Interaction(db.Model):
    """Model to store interactions within a campaign."""
    __tablename__ = 'interactions'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', back_populates='interactions')

    def __repr__(self):
        return f"<Interaction {self.id} in Campaign {self.campaign_id}>"

class AgentSettings(db.Model):
    """Model to store agent configurations for a campaign."""
    __tablename__ = 'agent_settings'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)  # e.g., "StoryAgent", "LoreAgent"
    parameters = db.Column(db.JSON, nullable=False)  # Store parameters as JSON

    # Relationships
    campaign = db.relationship('Campaign', back_populates='agent_settings')

    def __repr__(self):
        return f"<AgentSettings {self.agent_type} for Campaign {self.campaign_id}>"

class SpeechLog(db.Model):
    """Model to store speech logs."""
    __tablename__ = 'speech_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'))
    username = db.Column(db.String(150))
    text = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='speech_logs')
    campaign = db.relationship('Campaign', back_populates='speech_logs')

    def to_dict(self):
        return {
            'username': self.username,
            'text': self.text,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

    def __repr__(self):
        return f"<SpeechLog by {self.username} at {self.timestamp}>"

class DiscordLog(db.Model):
    """Model to store logs from Discord (if applicable)."""
    __tablename__ = 'discord_logs'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    username = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    campaign = db.relationship('Campaign', back_populates='discord_logs')

    def __repr__(self):
        return f"<DiscordLog by {self.username} at {self.timestamp}>"
