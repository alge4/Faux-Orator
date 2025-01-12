from datetime import datetime
from models import db

class GMAInteraction(db.Model):
    """Model for storing GMA chat interactions"""
    __tablename__ = 'gma_interactions'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    message = db.Column(db.Text, nullable=False)
    response = db.Column(db.Text, nullable=False)
    mode = db.Column(db.String(20), nullable=False)  # 'planning', 'playing', 'perpend'
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    
    # Relationships
    campaign = db.relationship('Campaign', backref='gma_interactions')
    user = db.relationship('User', backref='gma_interactions')

    def __repr__(self):
        return f'<GMAInteraction {self.id} - {self.mode}>'

    @classmethod
    def get_recent_by_mode(cls, campaign_id, mode, limit=10):
        return cls.query.filter_by(
            campaign_id=campaign_id,
            mode=mode
        ).order_by(cls.timestamp.desc()).limit(limit).all()

    def to_dict(self):
        return {
            'id': self.id,
            'message': self.message,
            'response': self.response,
            'mode': self.mode,
            'timestamp': self.timestamp.isoformat()
        }

class AgentSuggestion(db.Model):
    """Model for storing agent suggestions"""
    __tablename__ = 'agent_suggestions'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    agent_type = db.Column(db.String(50), nullable=False)  # 'story', 'lore', 'npc', etc.
    content = db.Column(db.Text, nullable=False)
    context = db.Column(db.String(100))  # What triggered this suggestion
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    used = db.Column(db.Boolean, default=False)  # Track if DM used this suggestion
    
    # Relationships
    campaign = db.relationship('Campaign', backref='agent_suggestions')

    def __repr__(self):
        return f'<AgentSuggestion {self.id} - {self.agent_type}>'

    @classmethod
    def get_active_suggestions(cls, campaign_id, context=None):
        query = cls.query.filter_by(campaign_id=campaign_id, used=False)
        if context:
            query = query.filter_by(context=context)
        return query.order_by(cls.timestamp.desc()).all()

    def mark_as_used(self):
        self.used = True
        db.session.commit()

class CampaignContext(db.Model):
    """Model for storing campaign context for GMA"""
    __tablename__ = 'campaign_contexts'

    id = db.Column(db.Integer, primary_key=True)
    campaign_id = db.Column(db.Integer, db.ForeignKey('campaigns.id'), nullable=False)
    context_type = db.Column(db.String(50), nullable=False)  # 'session', 'world', 'character', etc.
    content = db.Column(db.Text, nullable=False)
    last_updated = db.Column(db.DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    campaign = db.relationship('Campaign', backref='contexts')

    def __repr__(self):
        return f'<CampaignContext {self.id} - {self.context_type}>'

    @classmethod
    def get_or_create(cls, campaign_id, context_type):
        context = cls.query.filter_by(
            campaign_id=campaign_id,
            context_type=context_type
        ).first()
        
        if not context:
            context = cls(
                campaign_id=campaign_id,
                context_type=context_type,
                content=''
            )
            db.session.add(context)
            db.session.commit()
        
        return context

    def update_content(self, new_content):
        self.content = new_content
        self.last_updated = datetime.utcnow()
        db.session.commit() 