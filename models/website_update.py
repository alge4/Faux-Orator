from datetime import datetime
from . import db

class WebsiteUpdate(db.Model):
    """Model for website updates and announcements."""
    __tablename__ = 'website_updates'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    date = db.Column(db.DateTime, default=datetime.utcnow)
    type = db.Column(db.String(50))  # feature, bugfix, announcement

    def __repr__(self):
        return f"<WebsiteUpdate {self.title}>" 