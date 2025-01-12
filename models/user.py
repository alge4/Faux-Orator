from . import db, bcrypt
from flask_login import UserMixin
from datetime import datetime

class User(db.Model, UserMixin):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password = db.Column(db.String(60), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Relationships
    owned_campaigns = db.relationship('Campaign', 
                                    backref='owner',
                                    lazy=True,
                                    foreign_keys='Campaign.user_id')
    
    # Single relationship for joined campaigns
    joined_campaigns = db.relationship('Campaign',
                                     secondary='campaign_players',
                                     lazy='dynamic',
                                     overlaps="players")  # Add overlaps parameter

    def __init__(self, username, email, password):
        self.username = username
        self.email = email
        self.password = bcrypt.generate_password_hash(password).decode('utf-8')

    def check_password(self, password):
        return bcrypt.check_password_hash(self.password, password)

    def to_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email
        }

    def __repr__(self):
        return f'<User {self.username}>' 