from flask_socketio import SocketIO, join_room, leave_room, emit
from flask_login import current_user
from models import db, Campaign, Interaction

socketio = SocketIO()

@socketio.on('join')
def on_join(data):
    if not current_user.is_authenticated:
        return
    
    campaign_id = data.get('campaign_id')
    if campaign_id:
        join_room(str(campaign_id))
        emit('user_joined', {
            'user_id': current_user.id,
            'username': current_user.username
        }, room=str(campaign_id))

@socketio.on('leave')
def on_leave(data):
    if not current_user.is_authenticated:
        return
    
    campaign_id = data.get('campaign_id')
    if campaign_id:
        leave_room(str(campaign_id))
        emit('user_left', {
            'user_id': current_user.id,
            'username': current_user.username
        }, room=str(campaign_id)) 