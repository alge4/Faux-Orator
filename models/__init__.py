from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt

db = SQLAlchemy()
bcrypt = Bcrypt()

def init_app(app):
    if not hasattr(app, 'extensions') or 'sqlalchemy' not in app.extensions:
        db.init_app(app)
        bcrypt.init_app(app)
    
    # Import models here to avoid circular imports
    from .user import User
    from .campaign import Campaign
    from .interaction import Interaction
    from .discord_log import DiscordLog
    from .speech_log import SpeechLog
    from .campaign_invite import CampaignInvite
    from .character import Character
    from .website_update import WebsiteUpdate
    from .user_layout_preference import UserLayoutPreference
    from .voice_channel import VoiceChannel, VoiceChannelUser

    # Create tables in correct order
    with app.app_context():
        db.create_all()

    return db

# Import models in dependency order
from .user import User  # Must be first - other tables depend on it
from .campaign import Campaign
from .interaction import Interaction
from .discord_log import DiscordLog
from .speech_log import SpeechLog
from .campaign_invite import CampaignInvite
from .character import Character
from .website_update import WebsiteUpdate
from .user_layout_preference import UserLayoutPreference
from .voice_channel import VoiceChannel, VoiceChannelUser

# Define creation order
__all__ = [
    'User',  # First
    'Campaign',  # Depends on User
    'Interaction',  # Depends on User
    'DiscordLog',
    'SpeechLog',
    'CampaignInvite',  # Depends on User and Campaign
    'Character',  # Depends on User and Campaign
    'WebsiteUpdate',
    'UserLayoutPreference',  # Depends on User
    'VoiceChannel',  # Depends on Campaign
    'VoiceChannelUser'  # Depends on User and VoiceChannel
]

def register_models():
    """Function to register all models in dependency order"""
    return {name: globals()[name] for name in __all__} 