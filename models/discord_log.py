from datetime import datetime
from . import db

class DiscordLog(db.Model):
    """Model to store logs from Discord (if applicable)."""
    __tablename__ = 'discord_logs'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    username = db.Column(db.String(150), nullable=False)
    message = db.Column(db.Text, nullable=False)
    timestamp = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    related_campaign = db.relationship('Campaign', back_populates='discord_logs')

    def __repr__(self):
        return f"<DiscordLog by {self.username} at {self.timestamp}>" 