from flask import Blueprint, jsonify, request
from flask_login import login_required, current_user
from .models import VoiceChannel, VoiceChannelUser, db, Campaign
from .media_channels import media_manager
from .webrtc import WebRTCSignaling

routes = Blueprint('vox', __name__)

@routes.route('/channels/<int:campaign_id>', methods=['GET'])
@login_required
def get_channels(campaign_id):
    channels = VoiceChannel.query.filter_by(campaign_id=campaign_id)\
        .order_by(VoiceChannel.order_index).all()
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'active_users': [u.id for u in c.active_users]
    } for c in channels])

@routes.route('/channels/<int:channel_id>/join', methods=['POST'])
@login_required
def join_channel(channel_id):
    channel = VoiceChannel.query.get_or_404(channel_id)
    
    # Add user to channel in database
    channel_user = VoiceChannelUser(
        channel_id=channel_id,
        user_id=current_user.id
    )
    db.session.add(channel_user)
    db.session.commit()
    
    # Add user to media manager
    media_manager.create_channel(str(channel.campaign_id))
    media_manager.get_channel(str(channel.campaign_id)).add_user(
        str(current_user.id),
        current_user.username
    )
    
    return jsonify({'success': True}) 

@routes.route('/channels/<int:channel_id>/stats', methods=['GET'])
@login_required
def get_channel_stats(channel_id):
    """Get voice channel statistics"""
    channel = VoiceChannel.query.get_or_404(channel_id)
    
    # Check if user has access to channel
    if current_user.id != channel.campaign.user_id and current_user not in channel.campaign.players:
        return jsonify({'error': 'Unauthorized'}), 403
    
    stats = voice_monitor.get_channel_report(str(channel_id))
    if not stats:
        return jsonify({'error': 'No stats available'}), 404
    
    return jsonify(stats)

@routes.route('/webrtc/credentials', methods=['GET'])
@login_required
def get_turn_credentials():
    """Get TURN server credentials"""
    webrtc = WebRTCSignaling(media_manager)
    credentials = webrtc.generate_turn_credentials(str(current_user.id))
    return jsonify(credentials) 

@routes.route('/channels', methods=['POST'])
@login_required
def create_channel():
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    name = data.get('name')

    campaign = Campaign.query.get_or_404(campaign_id)
    if current_user.id != campaign.user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Get max order_index
    max_order = db.session.query(db.func.max(VoiceChannel.order_index))\
        .filter_by(campaign_id=campaign_id).scalar() or -1

    channel = VoiceChannel(
        campaign_id=campaign_id,
        name=name,
        order_index=max_order + 1
    )
    db.session.add(channel)
    db.session.commit()

    return jsonify(channel.to_dict()), 201

@routes.route('/channels/<int:channel_id>', methods=['PUT'])
@login_required
def update_channel(channel_id):
    channel = VoiceChannel.query.get_or_404(channel_id)
    if current_user.id != channel.campaign.user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    data = request.get_json()
    channel.name = data.get('name', channel.name)
    db.session.commit()

    return jsonify(channel.to_dict())

@routes.route('/channels/<int:channel_id>', methods=['DELETE'])
@login_required
def delete_channel(channel_id):
    channel = VoiceChannel.query.get_or_404(channel_id)
    
    # Check authorization
    if current_user.id != channel.campaign.user_id:
        return jsonify({'error': 'Unauthorized'}), 403

    # Check if this is the last channel
    channel_count = VoiceChannel.query.filter_by(campaign_id=channel.campaign_id).count()
    if channel_count <= 1:
        return jsonify({'error': 'Cannot delete the last channel'}), 400

    db.session.delete(channel)
    db.session.commit()

    return jsonify({'success': True}) 