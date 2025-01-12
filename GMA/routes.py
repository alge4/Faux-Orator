# gma/routes.py
from flask import Blueprint, request, jsonify, current_app
from flask_socketio import emit
from flask_login import login_required, current_user
from datetime import datetime
from models.campaign import Campaign
from models import db
from .models import GMAInteraction, AgentSuggestion, CampaignContext
from .agents import GameMastersAssistant

gma_bp = Blueprint('gma', __name__)

def get_gma():
    api_key = current_app.config['OPENAI_API_KEY']
    return GameMastersAssistant(api_key)

@gma_bp.route('/send_message', methods=['POST'])
@login_required
def send_message():
    data = request.get_json()
    message = data.get('message')
    mode = data.get('mode', 'planning')
    campaign_id = data.get('campaign_id')
    
    if not message or not campaign_id:
        return jsonify({'success': False, 'error': 'Missing required fields'})
    
    gma = get_gma()
    campaign = Campaign.query.get_or_404(campaign_id)
    
    # Get relevant context
    context = CampaignContext.get_or_create(campaign_id, mode)
    
    # Get recent interactions for context
    recent_interactions = GMAInteraction.get_recent_by_mode(campaign_id, mode)
    
    # Prepare context for GMA
    gma_context = {
        'mode': mode,
        'campaign_name': campaign.name,
        'campaign_context': context.content,
        'recent_interactions': [i.to_dict() for i in recent_interactions]
    }
    
    response = gma.handle_message(message, gma_context)
    
    # Store the interaction
    interaction = GMAInteraction(
        campaign_id=campaign_id,
        user_id=current_user.id,
        message=message,
        response=response,
        mode=mode
    )
    db.session.add(interaction)
    
    # Store any agent suggestions
    if hasattr(response, 'suggestions'):
        for suggestion in response.suggestions:
            agent_suggestion = AgentSuggestion(
                campaign_id=campaign_id,
                agent_type=suggestion['agent'],
                content=suggestion['content'],
                context=mode
            )
            db.session.add(agent_suggestion)
    
    db.session.commit()
    
    emit('gma_response', {
        'message': response,
        'mode': mode
    }, room=str(campaign_id))
    
    return jsonify({'success': True})

@gma_bp.route('/suggestions/<int:campaign_id>', methods=['GET'])
@login_required
def get_suggestions(campaign_id):
    context = request.args.get('context')
    suggestions = AgentSuggestion.get_active_suggestions(campaign_id, context)
    return jsonify([{
        'id': s.id,
        'agent_type': s.agent_type,
        'content': s.content,
        'context': s.context,
        'timestamp': s.timestamp.isoformat()
    } for s in suggestions])

@gma_bp.route('/context/<int:campaign_id>', methods=['GET', 'POST'])
@login_required
def manage_context(campaign_id):
    if request.method == 'GET':
        context_type = request.args.get('type', 'general')
        context = CampaignContext.get_or_create(campaign_id, context_type)
        return jsonify({
            'content': context.content,
            'last_updated': context.last_updated.isoformat()
        })
    else:
        data = request.get_json()
        context_type = data.get('type', 'general')
        content = data.get('content', '')
        context = CampaignContext.get_or_create(campaign_id, context_type)
        context.update_content(content)
        return jsonify({'success': True})

@gma_bp.route('/mark_suggestion_used/<int:suggestion_id>', methods=['POST'])
@login_required
def mark_suggestion_used(suggestion_id):
    suggestion = AgentSuggestion.query.get_or_404(suggestion_id)
    suggestion.mark_as_used()
    return jsonify({'success': True})
