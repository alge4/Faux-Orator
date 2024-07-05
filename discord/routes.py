# discord/routes.py
from flask import Blueprint, request, jsonify
from flask_login import login_required, current_user
from models import db, SpeechLog
import os
import requests

discord_bp = Blueprint('discord', __name__)

@discord_bp.route('/invite_bot', methods=['POST'])
@login_required
def invite_bot():
    data = request.get_json()
    invite_link = data.get('invite_link')
    
    if invite_link:
        # Process the invite link
        return jsonify(success=True, message='Bot invited successfully.')
    else:
        return jsonify(success=False, message='No invite link provided.')

@discord_bp.route('/fetch_speech_logs', methods=['GET'])
@login_required
def fetch_speech_logs():
    logs = SpeechLog.query.order_by(SpeechLog.timestamp.desc()).all()
    return jsonify([log.to_dict() for log in logs])
