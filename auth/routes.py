# auth/routes.py
from flask import Blueprint, render_template, redirect, url_for, request, flash, session, current_app
from flask_login import login_user, logout_user, login_required, current_user
from models import User, db
from flask_bcrypt import Bcrypt
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Message, Mail
from auth.forms import LoginForm, RegistrationForm, ResetPasswordRequestForm, ResetPasswordForm
from msal import ConfidentialClientApplication
import requests

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()
mail = Mail()
serializer = URLSafeTimedSerializer('your-secret-key')


@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    if current_user.is_authenticated:
        return redirect(url_for('main.main'))
    login_form = LoginForm()
    register_form = RegistrationForm()
    if login_form.validate_on_submit():
        user = User.query.filter_by(email=login_form.email.data).first()
        if user and bcrypt.check_password_hash(user.password, login_form.password.data):
            login_user(user)
            session['username'] = user.username
            flash('You have been logged in!', 'success')
            return redirect(url_for('main.main'))
        else:
            flash('Invalid credentials, please try again.', 'danger')
    return render_template('login.html', login_form=login_form, register_form=register_form)

@auth_bp.route('/register', methods=['GET', 'POST'])
def register():
    if current_user.is_authenticated:
        return redirect(url_for('main.main'))
    register_form = RegistrationForm()
    login_form = LoginForm()
    if register_form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(register_form.password.data).decode('utf-8')
        user = User(username=register_form.username.data, email=register_form.email.data, password=hashed_password)
        db.session.add(user)
        db.session.commit()
        template_campaign = Campaign(name='Lost Mines of Phandelver', user_id=user.id)
        db.session.add(template_campaign)
        db.session.commit()
        user.favorite_campaign_id = template_campaign.id
        db.session.commit()
        login_user(user)
        session['username'] = user.username
        flash('Your account has been created and you are now logged in!', 'success')
        return redirect(url_for('main.main'))
    return render_template('login.html', login_form=login_form, register_form=register_form)

@auth_bp.route('/logout')
@login_required
def logout():
    logout_user()
    flash('You have been logged out.', 'success')
    return redirect(url_for('auth.login'))

@auth_bp.route('/reset_password', methods=['GET', 'POST'])
def reset_password_request():
    form = ResetPasswordRequestForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=form.email.data).first()
        if user:
            token = serializer.dumps(user.email, salt='password-reset-salt')
            reset_url = url_for('auth.reset_password', token=token, _external=True)
            msg = Message('Password Reset Request', sender='noreply@example.com', recipients=[user.email])
            msg.body = f'Reset your password using this link: {reset_url}'
            mail.send(msg)
            flash('Password reset link has been sent to your email.', 'info')
        else:
            flash('Email address not found.', 'danger')
    return render_template('reset_password_request.html', form=form)

@auth_bp.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except Exception as e:
        flash('The password reset link is invalid or has expired.', 'danger')
        return redirect(url_for('auth.login'))

    form = ResetPasswordForm()
    if form.validate_on_submit():
        user = User.query.filter_by(email=email).first()
        if user:
            hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
            user.password = hashed_password
            db.session.commit()
            flash('Your password has been updated!', 'success')
            return redirect(url_for('auth.login'))
        else:
            flash('User not found.', 'danger')
            return redirect(url_for('auth.login'))
    
    return render_template('reset_password.html', form=form)

@auth_bp.route('/ms_login')
def ms_login():
    client_app = ConfidentialClientApplication(
        current_app.config['MS_CLIENT_ID'],
        authority=current_app.config['MS_AUTHORITY'],
        client_credential=current_app.config['MS_CLIENT_SECRET']
    )
    
    scopes = ["User.Read"]
    
    auth_url = client_app.get_authorization_request_url(
        scopes,
        redirect_uri=url_for('auth.ms_callback', _external=True)
    )
    return redirect(auth_url)

@auth_bp.route('/ms_callback')
def ms_callback():
    client_app = ConfidentialClientApplication(
        current_app.config['MS_CLIENT_ID'],
        authority=current_app.config['MS_AUTHORITY'],
        client_credential=current_app.config['MS_CLIENT_SECRET']
    )
    code = request.args.get('code')
    result = client_app.acquire_token_by_authorization_code(
        code,
        scopes=["User.Read"],
        redirect_uri=url_for('auth.ms_callback', _external=True)
    )

    if "access_token" in result:
        user_info = requests.get(
            'https://graph.microsoft.com/v1.0/me',
            headers={'Authorization': 'Bearer ' + result['access_token']}
        ).json()
        
        # Handle cases where email might not be provided
        email = user_info.get('mail') or user_info.get('userPrincipalName')
        
        # Check if user exists in your database
        user = User.query.filter_by(email=email).first()
        if not user:
            # Create a new user if not exist
            user = User(
                username=user_info['displayName'],
                email=email,
                password=bcrypt.generate_password_hash(current_app.config['SECRET_KEY']).decode('utf-8')  # Set a default password
            )
            db.session.add(user)
            db.session.commit()
        
        login_user(user)
        session['username'] = user.username
        return redirect(url_for('main.main'))
    else:
        flash('Failed to authenticate with Microsoft.', 'danger')
        return redirect(url_for('auth.login'))
