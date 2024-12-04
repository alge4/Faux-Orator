# main/forms.py
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField, BooleanField, SelectField
from wtforms.validators import DataRequired

class AddCampaignForm(FlaskForm):
    name = StringField('Campaign Name', validators=[DataRequired()])
    submit = SubmitField('Add')

class VoxSettingsForm(FlaskForm):
    vox_debug_enabled = BooleanField('Enable Debug Logging')
    vox_log_level = SelectField('Log Level', choices=[
        ('ERROR', 'Error Only'),
        ('WARNING', 'Warning & Error'),
        ('INFO', 'Info & Above'),
        ('DEBUG', 'All (Debug)')
    ])
    submit = SubmitField('Save Settings')
