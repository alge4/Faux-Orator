# gma/routes.py
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit
from flask_login import login_required
from .agents import GameMastersAssistant

gma_bp = Blueprint('gma', __name__)

def get_gma():
    api_key = current_app.config['OPENAI_API_KEY']
    return GameMastersAssistant(api_key)

@gma_bp.route('/send_message', methods=['POST'])
@login_required
def send_message():
    gma = get_gma()
    message = request.form['message']
    response = gma.handle_message(message)
    emit('gma_response', response, broadcast=True)
    return jsonify(success=True, response=response)

@gma_bp.route('/test_openai', methods=['GET'])
def test_openai():
    gma = get_gma()
    response = gma.story_agent.get_idea()
    return jsonify(success=True, response=response)

@gma_bp.route('/get_custom_story', methods=['POST'])
@login_required
def get_custom_story():
    gma = get_gma()
    prompt = request.form['prompt']
    response = gma.story_agent.get_custom_story(prompt)
    return jsonify(success=True, response=response)
