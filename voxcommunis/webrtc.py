from flask import current_app
from flask_socketio import emit
from datetime import datetime
from .media_channels import MediaChannelManager
import json
import hmac
import time

class WebRTCSignaling:
    def __init__(self, media_manager: MediaChannelManager):
        self.media_manager = media_manager

    def generate_turn_credentials(self, username: str) -> dict:
        """Generate time-limited credentials for TURN server"""
        timestamp = int(time.time()) + 24 * 3600  # 24 hour validity
        turn_secret = current_app.config['TURN_SECRET']
        username_with_timestamp = f"{timestamp}:{username}"
        
        # Generate HMAC using SHA1
        hmac_obj = hmac.new(
            turn_secret.encode(),
            username_with_timestamp.encode(),
            'sha1'
        )
        password = hmac_obj.hexdigest()
        
        return {
            'username': username_with_timestamp,
            'password': password,
            'ttl': 86400
        }

    def handle_offer(self, user_id: str, target_id: str, campaign_id: str, offer: dict):
        """Handle WebRTC offer"""
        channel = self.media_manager.get_channel(campaign_id)
        if not channel or target_id not in channel.users:
            return False

        emit('webrtc_offer', {
            'offer': offer,
            'from': user_id
        }, room=f'user_{target_id}')
        return True

    def handle_answer(self, user_id: str, target_id: str, campaign_id: str, answer: dict):
        """Handle WebRTC answer"""
        channel = self.media_manager.get_channel(campaign_id)
        if not channel or target_id not in channel.users:
            return False

        emit('webrtc_answer', {
            'answer': answer,
            'from': user_id
        }, room=f'user_{target_id}')
        return True

    def handle_ice_candidate(self, user_id: str, target_id: str, campaign_id: str, candidate: dict):
        """Handle ICE candidate"""
        channel = self.media_manager.get_channel(campaign_id)
        if not channel or target_id not in channel.users:
            return False

        emit('webrtc_ice_candidate', {
            'candidate': candidate,
            'from': user_id
        }, room=f'user_{target_id}')
        return True 