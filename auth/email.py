from flask_mail import Message
from app import mail

def send_reset_email(user, token):
    reset_url = url_for('auth.reset_password', token=token, _external=True)
    msg = Message('Password Reset Request', sender='noreply@example.com', recipients=[user.email])
    msg.body = f'Reset your password using this link: {reset_url}'
    mail.send(msg)
