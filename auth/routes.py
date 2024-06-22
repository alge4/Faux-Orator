from flask import Blueprint, render_template, redirect, url_for, request, flash, session
from models import User, db
from flask_bcrypt import Bcrypt
from itsdangerous import URLSafeTimedSerializer
from flask_mail import Message, Mail
from .forms import LoginForm, RegistrationForm, ResetPasswordRequestForm, ResetPasswordForm

auth_bp = Blueprint('auth', __name__)
bcrypt = Bcrypt()
mail = Mail()
serializer = URLSafeTimedSerializer('your-secret-key')

@auth_bp.route('/login', methods=['GET', 'POST'])
def login():
    form = LoginForm()
    if form.validate_on_submit():
        user = User.query.filter_by(username=form.username.data).first()
        if user and bcrypt.check_password_hash(user.password, form.password.data):
            session['username'] = user.username
            return redirect(url_for('main.main'))
        else:
            flash('Invalid credentials, please try again.', 'danger')
    return render_template('login.html', form=form)

@auth_bp.route('/register', methods=['POST'])
def register():
    form = RegistrationForm()
    if form.validate_on_submit():
        hashed_password = bcrypt.generate_password_hash(form.password.data).decode('utf-8')
        new_user = User(email=form.email.data, username=form.username.data, password=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        session['username'] = new_user.username
        return redirect(url_for('main.main'))
    return render_template('register.html', form=form)

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
