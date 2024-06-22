# main/routes.py
from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
from flask_login import login_required, current_user, logout_user
from models import User, Campaign, db
from main.forms import AddCampaignForm  # Use relative import

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
    return render_template('main.html', phase='planning', campaigns=campaigns, user=user, form=form)

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
    return redirect(url_for('main.main'))

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
    return render_template('playing.html', phase='playing', campaigns=user.campaigns, user=user, form=form)

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
    user.favorite_campaign_id = campaign_id
    db.session.commit()
    return jsonify(success=True)
