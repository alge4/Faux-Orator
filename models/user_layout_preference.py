from . import db

class UserLayoutPreference(db.Model):
    """Model for storing user interface layout preferences."""
    __tablename__ = 'user_layout_preferences'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    layout_data = db.Column(db.JSON)

    # Relationship
    user = db.relationship('User', backref=db.backref('layout_preferences', lazy=True, uselist=False))

    def __repr__(self):
        return f"<UserLayoutPreference for user {self.user_id}>" 