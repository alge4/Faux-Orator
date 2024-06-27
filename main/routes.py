# main/routes.py
from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template, flash
from flask_login import login_required, current_user, logout_user
from models import User, Campaign, db
from main.forms import AddCampaignForm

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def landing_page():
    return render_template('index.html')

@main_bp.route('/main')
@login_required
def main():
    user = current_user
    campaigns = Campaign.query.filter_by(user_id=user.id).order_by(Campaign.order).all()
    campaigns.sort(key=lambda x: x.id != user.favorite_campaign_id)
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

@main_bp.route('/update_campaign_order', methods=['POST'])
@login_required
def update_campaign_order():
    data = request.get_json()
    order = data.get('order')
    favorite_campaign_id = current_user.favorite_campaign_id

    if order[0] != favorite_campaign_id:
        return jsonify(success=False, message='Favorite campaign must be at the top.')

    for index, campaign_id in enumerate(order):
        campaign = Campaign.query.get(campaign_id)
        if campaign.user_id == current_user.id:
            campaign.order = index
    db.session.commit()
    return jsonify(success=True)

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
