from flask import Blueprint, request, jsonify, render_template, flash, session
from flask_login import login_required, current_user, logout_user
from models import User, Campaign, Interaction, DiscordLog, db,SpeechLog
from main.forms import AddCampaignForm

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def landing_page():
    return render_template('index.html')

@main_bp.route('/main')
@login_required
def main():
    user = current_user
    campaigns = user.campaigns
    form = AddCampaignForm()
    phase = 'planning'  # Default phase or get from the session
    discord_logs = []

    if phase == 'playing':
        # Fetch discord logs only if the phase is playing
        discord_logs = DiscordLog.query.filter_by(campaign_id=user.favorite_campaign_id).all()

    return render_template('main.html', phase=phase, campaigns=campaigns, user=user, form=form, discord_logs=discord_logs)

@main_bp.route('/logout')
@login_required
def logout():
    logout_user()
    return redirect(url_for('auth.login'))

@main_bp.route('/add_campaign', methods=['POST'])
@login_required
def add_campaign():
    user = current_user
    form = AddCampaignForm()
    if form.validate_on_submit():
        name = form.name.data
        new_campaign = Campaign(name=name, user_id=user.id)
        db.session.add(new_campaign)
        db.session.commit()
        flash('Campaign added successfully.', 'success')
    else:
        flash('Error adding campaign. Please try again.', 'danger')
    return redirect(url_for('main.main'))

@main_bp.route('/edit_campaign/<int:campaign_id>', methods=['POST'])
@login_required
def edit_campaign(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if campaign.user_id != current_user.id:
        return jsonify(success=False, message='Permission denied.')

    data = request.get_json()
    campaign.name = data['name']
    db.session.commit()
    return jsonify(success=True)

@main_bp.route('/delete_campaign/<int:campaign_id>', methods=['POST'])
@login_required
def delete_campaign(campaign_id):
    campaign = Campaign.query.get_or_404(campaign_id)
    if campaign.user_id != current_user.id:
        return jsonify(success=False, message='Permission denied.')

    db.session.delete(campaign)
    db.session.commit()
    return jsonify(success=True)

@main_bp.route('/planning')
@login_required
def planning():
    user = current_user
    form = AddCampaignForm()
    return render_template('planning.html', phase='planning', campaigns=user.campaigns, user=user, form=form)

@main_bp.route('/playing')
@login_required
def playing():
    user = current_user
    form = AddCampaignForm()
    discord_logs = DiscordLog.query.filter_by(campaign_id=user.favorite_campaign_id).all()
    return render_template('playing.html', phase='playing', campaigns=user.campaigns, user=user, form=form, discord_logs=discord_logs)

@main_bp.route('/review')
@login_required
def review():
    user = current_user
    form = AddCampaignForm()
    return render_template('review.html', phase='review', campaigns=user.campaigns, user=user, form=form)

@main_bp.route('/set_favorite_campaign', methods=['POST'])
@login_required
def set_favorite_campaign():
    user = current_user
    data = request.get_json()
    campaign_id = data.get('campaign_id')
    campaign = Campaign.query.get_or_404(campaign_id)

    if campaign.user_id != user.id:
        return jsonify(success=False, message='Permission denied.')

    # Update the user's favorite campaign
    user.favorite_campaign_id = campaign_id
    db.session.commit()
    return jsonify(success=True, campaign_id=campaign_id)

@main_bp.route('/fetch_speech_logs', methods=['GET'])
@login_required
def fetch_speech_logs():
    campaign_id = request.args.get('campaign_id')
    logs = SpeechLog.query.filter_by(campaign_id=campaign_id).order_by(SpeechLog.timestamp.desc()).all()
    return jsonify(logs=[log.to_dict() for log in logs])

# Add a function to convert model to dict
class SpeechLog(db.Model):
    ...
    def to_dict(self):
        return {
            'username': self.username,
            'text': self.text,
            'timestamp': self.timestamp.strftime('%Y-%m-%d %H:%M:%S')
        }
