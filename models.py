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

class Interaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaign.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)
