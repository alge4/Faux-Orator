from datetime import datetime
from . import db

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
    related_campaign = db.relationship('Campaign', back_populates='speech_logs')

    def to_dict(self):
        return {
            'username': self.username,
            'text': self.text,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }

    def __repr__(self):
        return f"<SpeechLog by {self.username} at {self.timestamp}>" 