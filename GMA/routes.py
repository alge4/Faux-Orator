from flask import Blueprint
from flask_socketio import emit
from .ai import GameMastersAssistant

gma_bp = Blueprint('gma', __name__)
gma = GameMastersAssistant()

@gma_bp.route('/get_story_idea')
def handle_get_story_idea():
    idea = gma.get_story_idea()
    emit('story_idea', idea)

@gma_bp.route('/get_rule_clarification')
def handle_get_rule_clarification(data):
    query = data['query']
    clarification = gma.get_rule_clarification(query)
    emit('rule_clarification', clarification)

@gma_bp.route('/get_npc_dialogue')
def handle_get_npc_dialogue(data):
    npc_name = data['npc_name']
    dialogue = gma.get_npc_dialogue(npc_name)
    emit('npc_dialogue', dialogue)

@gma_bp.route('/get_lore_info')
def handle_get_lore_info(data):
    topic = data['topic']
    info = gma.get_lore_info(topic)
    emit('lore_info', info)
