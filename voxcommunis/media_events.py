from flask_socketio import emit, join_room, leave_room, rooms
from flask_login import current_user
from .media_channels import MediaChannelManager, MediaType
from . import socketio

media_manager = MediaChannelManager()

def register_media_events(socketio):
    @socketio.on('join_channel')
    def handle_join_channel(data):
        if not current_user.is_authenticated:
            return False

        campaign_id = data.get('campaign_id')
        if not campaign_id:
            return False

        user = media_manager.join_channel(
            campaign_id=str(campaign_id),
            user_id=str(current_user.id),
            username=current_user.username
        )

        if user:
            join_room(f'media_{campaign_id}')
            emit('user_joined_channel', {
                'user_id': user.user_id,
                'username': user.username,
                'campaign_id': campaign_id
            }, room=f'media_{campaign_id}')
            return True
        return False

    @socketio.on('stream_update')
    def handle_stream_update(data):
        """Handle updates to user's media streams"""
        if not current_user.is_authenticated:
            return False

        campaign_id = data.get('campaign_id')
        stream_id = data.get('stream_id')
        media_type = MediaType(data.get('type'))

        success = media_manager.handle_stream_update(
            campaign_id=str(campaign_id),
            user_id=str(current_user.id),
            stream_id=stream_id,
            media_type=media_type
        )

        if success:
            emit('stream_updated', {
                'user_id': str(current_user.id),
                'stream_id': stream_id,
                'type': media_type.value
            }, room=f'media_{campaign_id}')
            return True
        return False

    @socketio.on('start_broadcast')
    def handle_start_broadcast(data):
        """Handle starting a Spotify/YouTube broadcast"""
        if not current_user.is_authenticated:
            return False

        campaign_id = data.get('campaign_id')
        media_type = MediaType(data.get('type'))
        media_id = data.get('media_id')

        success = media_manager.start_broadcast(
            campaign_id=str(campaign_id),
            user_id=str(current_user.id),
            media_type=media_type,
            media_id=media_id
        )

        if success:
            emit('broadcast_started', {
                'user_id': str(current_user.id),
                'type': media_type.value,
                'media_id': media_id
            }, room=f'media_{campaign_id}')
            return True
        return False

    @socketio.on('offer', namespace='/vox')
    def handle_offer(data):
        if not current_user.is_authenticated:
            return False
        
        campaign_id = data.get('campaign_id')
        target_user = data.get('target')
        offer = data.get('offer')
        
        emit('offer', {
            'offer': offer,
            'from': str(current_user.id)
        }, room=f'user_{target_user}')

    @socketio.on('answer', namespace='/vox')
    def handle_answer(data):
        if not current_user.is_authenticated:
            return False
        
        target_user = data.get('target')
        answer = data.get('answer')
        
        emit('answer', {
            'answer': answer,
            'from': str(current_user.id)
        }, room=f'user_{target_user}')

    @socketio.on('ice_candidate', namespace='/vox')
    def handle_ice_candidate(data):
        if not current_user.is_authenticated:
            return False
        
        target_user = data.get('target')
        candidate = data.get('candidate')
        
        emit('ice_candidate', {
            'candidate': candidate,
            'from': str(current_user.id)
        }, room=f'user_{target_user}')

    @socketio.on('leave_channel', namespace='/vox')
    def handle_leave_channel(data):
        if not current_user.is_authenticated:
            return False

        campaign_id = data.get('campaign_id')
        if not campaign_id:
            return False

        for room in rooms():
            if room.startswith(f'media_{campaign_id}'):
                leave_room(room)
            
        emit('user_left_channel', {
            'user_id': str(current_user.id),
            'campaign_id': campaign_id
        }, room=f'media_{campaign_id}')
        return True