# models.py
from flask_sqlalchemy import SQLAlchemy
from flask_login import UserMixin
from datetime import datetime
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(128), nullable=False)
    campaigns = db.relationship('Campaign', backref='user', lazy=True, foreign_keys='Campaign.user_id')
    favorite_campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'))

    def __init__(self, **kwargs):
        super(User, self).__init__(**kwargs)
        if 'password' in kwargs:
            self.password = bcrypt.generate_password_hash(kwargs['password']).decode('utf-8')
        self.set_default_campaign()

    def set_default_campaign(self):
        if self.favorite_campaign_id is None:
            default_campaign = Campaign(name='Lost Mines of Phandelver', user=self)
            db.session.add(default_campaign)
            db.session.commit()
            self.favorite_campaign_id = default_campaign.id
            db.session.commit()

    def get_id(self):
        return self.id

    @property
    def is_active(self):
        return True

    @property
    def is_authenticated(self):
        return True

    @property
    def is_anonymous(self):
        return False

class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    interactions = db.relationship('Interaction', backref='campaign', lazy=True)
    order = db.Column(db.Integer, default=0)
    agent_settings = db.relationship('AgentSettings', back_populates='campaign', cascade='all, delete-orphan')
    discord_logs = db.relationship('DiscordLog', backref='campaign', lazy=True)

class Interaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

class AgentSettings(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)  # e.g., "StoryAgent", "LoreAgent"
    parameters = db.Column(db.JSON, nullable=False)  # Store parameters as JSON

    campaign = db.relationship('Campaign', back_populates='agent_settings')

class SpeechLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'))
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'))
    username = db.Column(db.String(64))
    text = db.Column(db.Text)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

    def to_dict(self):
        return {
            'username': self.username,
            'text': self.text,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

class DiscordLog(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    username = db.Column(db.String(64), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    campaign = db.relationship('Campaign', back_populates='discord_logs')
