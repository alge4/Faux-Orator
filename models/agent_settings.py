from datetime import datetime
from . import db

class AgentSettings(db.Model):
    """Model to store agent configurations for a campaign."""
    __tablename__ = 'agent_settings'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)  # e.g., "StoryAgent", "LoreAgent"
    parameters = db.Column(db.JSON, nullable=False)  # Store parameters as JSON

    # Relationships
    related_campaign = db.relationship('Campaign', back_populates='agent_settings')

    def __repr__(self):
        return f"<AgentSettings {self.agent_type} for Campaign {self.campaign_id}>" 