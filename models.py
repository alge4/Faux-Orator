# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(UserMixin, db.Model):
    """Database model for users."""
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(120), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    favorite_campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=True)

    # Relationships
    campaigns = db.relationship('Campaign', 
                              foreign_keys='Campaign.user_id',
                              back_populates='owner',
                              lazy=True)
    favorite_campaign = db.relationship('Campaign',
                                      foreign_keys=[favorite_campaign_id],
                                      uselist=False)
    speech_logs = db.relationship('SpeechLog', back_populates='user', lazy=True)

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if 'password' in kwargs:
            self.password = bcrypt.generate_password_hash(kwargs['password']).decode('utf-8')

    def get_id(self):
        return self.id

    def __repr__(self):
        return f"<User {self.username}>"

class Campaign(db.Model):
    """Database model for campaigns."""
    __tablename__ = 'campaigns'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)

    # Relationships
    owner = db.relationship('User', 
                          foreign_keys=[user_id],
                          back_populates='campaigns')
    
    interactions = db.relationship('Interaction', 
                                 back_populates='related_campaign',
                                 lazy=True)
    discord_logs = db.relationship('DiscordLog', 
                                 back_populates='related_campaign',
                                 lazy=True)
    speech_logs = db.relationship('SpeechLog', 
                                back_populates='related_campaign',
                                lazy=True)
    agent_settings = db.relationship('AgentSettings',
                                   back_populates='related_campaign',
                                   lazy=True,
                                   uselist=False)

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
    related_campaign = db.relationship('Campaign', back_populates='interactions', overlaps="campaign")

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
    related_campaign = db.relationship('Campaign', back_populates='agent_settings', overlaps="campaign")

    def __repr__(self):
        return f"<AgentSettings {self.agent_type} for Campaign {self.campaign_id}>"

class SpeechLog(db.Model):
    """Model to store speech logs."""
    __tablename__ = 'speech_logs'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'))
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    username = db.Column(db.String(150))
    text = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    user = db.relationship('User', back_populates='speech_logs')
    related_campaign = db.relationship('Campaign', back_populates='speech_logs', overlaps="campaign")

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
    related_campaign = db.relationship('Campaign', back_populates='discord_logs', overlaps="campaign")

    def __repr__(self):
        return f"<DiscordLog by {self.username} at {self.timestamp}>"
