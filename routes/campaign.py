from flask import render_template, request, redirect, url_for, flash
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired
from models import db, Campaign

class CampaignForm(FlaskForm):
    name = StringField('Name', validators=[DataRequired()])
    submit = SubmitField('Create Campaign')

@bp.route('/add_campaign', methods=['POST'])
@login_required
def add_campaign():
    form = CampaignForm()
    if form.validate_on_submit():
        campaign = Campaign(
            name=form.name.data,
            user_id=current_user.id
        )
        db.session.add(campaign)
        db.session.commit()
        
        # Initialize default voice channels
        campaign.initialize_default_channels()
        
        flash('Campaign created successfully!', 'success')
        return redirect(url_for('main.index'))
    return redirect(url_for('main.index')) 