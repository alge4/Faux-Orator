# main/forms.py
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired

class AddCampaignForm(FlaskForm):
    name = StringField('Campaign Name', validators=[DataRequired()])
    submit = SubmitField('Add')
