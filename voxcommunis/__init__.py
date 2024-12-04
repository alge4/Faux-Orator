from flask import Blueprint
from flask_socketio import SocketIO

socketio = SocketIO()
vox_bp = Blueprint('vox', __name__)

from . import media_events, media_channels

def init_app(app):
    """Initialize Vox Communis with the Flask app"""
    socketio.init_app(app, cors_allowed_origins="*")
    app.register_blueprint(vox_bp, url_prefix='/vox')
