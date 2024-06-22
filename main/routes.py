from flask import Blueprint, render_template, redirect, url_for, session
from models import User

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
def landing_page():
    return render_template('index.html')

@main_bp.route('/main')
def main():
    if 'username' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('main.html', phase='planning', campaigns=user.campaigns)

@main_bp.route('/planning')
def planning():
    if 'username' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('planning.html', phase='planning', campaigns=user.campaigns)

@main_bp.route('/playing')
def playing():
    if 'username' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('playing.html', phase='playing', campaigns=user.campaigns)

@main_bp.route('/review')
def review():
    if 'username' not in session:
        return redirect(url_for('auth.login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('review.html', phase='review', campaigns=user.campaigns)

@main_bp.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('main.landing_page'))
