from dataclasses import dataclass, field
from typing import Dict, Set, Optional, List
from datetime import datetime
from enum import Enum

class MediaType(Enum):
    AUDIO = "audio"
    VIDEO = "video"
    SCREEN = "screen"
    SPOTIFY = "spotify"
    YOUTUBE = "youtube"

@dataclass
class MediaStream:
    stream_id: str
    type: MediaType
    user_id: str
    enabled: bool = True
    
@dataclass
class ChannelUser:
    user_id: str
    username: str
    campaign_id: str
    joined_at: datetime = field(default_factory=datetime.utcnow)
    is_speaking: bool = False
    is_muted: bool = False
    video_enabled: bool = False
    screen_sharing: bool = False
    streams: Dict[str, MediaStream] = field(default_factory=dict)

class MediaChannel:
    def __init__(self, campaign_id: str, max_users: int = 20):
        self.campaign_id = campaign_id
        self.max_users = max_users
        self.users: Dict[str, ChannelUser] = {}
        self.created_at = datetime.utcnow()
        self.active_media: Optional[Dict] = None  # For Spotify/YouTube broadcasts

    def add_user(self, user_id: str, username: str) -> Optional[ChannelUser]:
        """Add a user to the channel"""
        if len(self.users) >= self.max_users:
            return None
            
        if user_id not in self.users:
            user = ChannelUser(
                user_id=user_id, 
                username=username, 
                campaign_id=self.campaign_id
            )
            self.users[user_id] = user
            return user
        return self.users[user_id]

    def add_user_stream(self, user_id: str, stream_id: str, media_type: MediaType) -> bool:
        """Add a media stream for a user"""
        if user_id in self.users:
            self.users[user_id].streams[stream_id] = MediaStream(
                stream_id=stream_id,
                type=media_type,
                user_id=user_id
            )
            return True
        return False

    def remove_user_stream(self, user_id: str, stream_id: str) -> bool:
        """Remove a media stream from a user"""
        if user_id in self.users and stream_id in self.users[user_id].streams:
            del self.users[user_id].streams[stream_id]
            return True
        return False

    def start_media_broadcast(self, user_id: str, media_type: MediaType, media_id: str):
        """Start a Spotify or YouTube broadcast"""
        if media_type in [MediaType.SPOTIFY, MediaType.YOUTUBE]:
            self.active_media = {
                'type': media_type,
                'media_id': media_id,
                'broadcaster_id': user_id,
                'started_at': datetime.utcnow(),
                'viewers': set([user_id])
            }
            return True
        return False

    def stop_media_broadcast(self):
        """Stop the current media broadcast"""
        self.active_media = None

    def remove_user(self, user_id: str) -> Optional[ChannelUser]:
        """Remove a user from the channel"""
        return self.users.pop(user_id, None)

    def update_user_status(self, user_id: str, is_speaking: bool = None, 
                          is_muted: bool = None, video_enabled: bool = None) -> bool:
        """Update user status in the channel"""
        if user_id in self.users:
            user = self.users[user_id]
            if is_speaking is not None:
                user.is_speaking = is_speaking
            if is_muted is not None:
                user.is_muted = is_muted
            if video_enabled is not None:
                user.video_enabled = video_enabled
            return True
        return False

class MediaChannelManager:
    def __init__(self):
        self.channels: Dict[str, MediaChannel] = {}

    def create_channel(self, campaign_id: str, max_users: int = 20) -> MediaChannel:
        """Create a new media channel for a campaign"""
        if campaign_id not in self.channels:
            self.channels[campaign_id] = MediaChannel(campaign_id, max_users)
        return self.channels[campaign_id]

    def handle_stream_update(self, campaign_id: str, user_id: str, 
                           stream_id: str, media_type: MediaType) -> bool:
        """Handle new media stream creation"""
        channel = self.get_channel(campaign_id)
        if channel:
            return channel.add_user_stream(user_id, stream_id, media_type)
        return False

    def start_broadcast(self, campaign_id: str, user_id: str, 
                       media_type: MediaType, media_id: str) -> bool:
        """Start a media broadcast in a channel"""
        channel = self.get_channel(campaign_id)
        if channel:
            return channel.start_media_broadcast(user_id, media_type, media_id)
        return False

    def get_channel(self, campaign_id: str) -> Optional[MediaChannel]:
        """Get a channel by campaign ID"""
        return self.channels.get(campaign_id)

    def remove_channel(self, campaign_id: str) -> Optional[MediaChannel]:
        """Remove a channel"""
        return self.channels.pop(campaign_id, None)

    def get_user_channels(self, user_id: str) -> List[str]:
        """Get all channels a user is in"""
        return [
            campaign_id for campaign_id, channel in self.channels.items()
            if user_id in channel.users
        ]