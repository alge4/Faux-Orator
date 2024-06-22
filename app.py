import os
from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_mail import Mail, Message
from itsdangerous import URLSafeTimedSerializer
from datetime import datetime
from dotenv import load_dotenv
from sqlalchemy.orm import relationship
from flask import Flask, render_template, request, jsonify
from flask_socketio import SocketIO, emit

# Load environment variables from .env file
load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv('SECRET_KEY')
socketio = SocketIO(app)

# Database configuration
basedir = os.path.abspath(os.path.dirname(__file__))
db_path = os.path.join(basedir, 'instance', 'users.db')
app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{db_path}'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Flask-Mail configuration
app.config['MAIL_SERVER'] = os.getenv('MAIL_SERVER')
app.config['MAIL_PORT'] = os.getenv('MAIL_PORT')
app.config['MAIL_USE_TLS'] = os.getenv('MAIL_USE_TLS')
app.config['MAIL_USERNAME'] = os.getenv('MAIL_USERNAME')
app.config['MAIL_PASSWORD'] = os.getenv('MAIL_PASSWORD')

mail = Mail(app)

# Initialize extensions
db = SQLAlchemy(app)
bcrypt = Bcrypt(app)
migrate = Migrate(app, db)

# Secret key for generating tokens
serializer = URLSafeTimedSerializer(app.secret_key)

# User model
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(150), nullable=False, unique=True)
    username = db.Column(db.String(150), nullable=False, unique=True)
    password = db.Column(db.String(150), nullable=False)
    campaigns = relationship('Campaign', back_populates='user')

# Campaign model
class Campaign(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(150), nullable=False)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    user = relationship('User', back_populates='campaigns')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameMastersAssistant:
    def __init__(self):
        self.story_ai = StoryCreativeIdeasAI()
        self.rules_ai = DnD5eRulesLawyerAI()
        self.npc_ai = NPCManagerAI()
        self.lore_ai = LoreGuideAI()
    
    def get_story_idea(self):
        return self.story_ai.generate_idea()

    def get_rule_clarification(self, query):
        return self.rules_ai.clarify_rule(query)
    
    def get_npc_dialogue(self, npc_name):
        return self.npc_ai.get_dialogue(npc_name)
    
    def get_lore_info(self, topic):
        return self.lore_ai.get_info(topic)
    
    def update_configurations(self, configs):
        self.story_ai.update_config(configs)
        self.rules_ai.update_config(configs)
        self.npc_ai.update_config(configs)
        self.lore_ai.update_config(configs)
    
    def review_session(self, session_data):
        # Review and update session data
        pass

class StoryCreativeIdeasAI:
    def generate_idea(self):
        # Generate creative story ideas
        return "A mysterious stranger offers the party a quest."

class DnD5eRulesLawyerAI:
    def clarify_rule(self, query):
        # Clarify rules based on DnD 5th Edition
        return "According to page 75 of the Player's Handbook..."

class NPCManagerAI:
    def get_dialogue(self, npc_name):
        # Generate NPC dialogue
        return f"{npc_name}: Welcome, adventurers!"

class LoreGuideAI:
    def get_info(self, topic):
        # Provide lore information
        return f"The ancient city of {topic} is known for..."


# Create database tables
with app.app_context():
    db.create_all()

@app.route('/')
def landing_page():
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        user = User.query.filter_by(username=username).first()
        if user and bcrypt.check_password_hash(user.password, password):
            session['username'] = user.username
            return redirect(url_for('main'))
        else:
            flash('Invalid credentials, please try again.', 'danger')
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    email = request.form['email']
    username = request.form['username']
    password = request.form['password']
    user_exists = User.query.filter_by(username=username).first()
    email_exists = User.query.filter_by(email=email).first()
    if user_exists or email_exists:
        flash('User or email already exists, please login.', 'warning')
        return redirect(url_for('login'))
    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(email=email, username=username, password=hashed_password)
    db.session.add(new_user)
    db.session.commit()
    session['username'] = new_user.username
    return redirect(url_for('main'))

@app.route('/reset_password', methods=['GET', 'POST'])
def reset_password_request():
    if request.method == 'POST':
        email = request.form['email']
        user = User.query.filter_by(email=email).first()
        if user:
            token = serializer.dumps(email, salt='password-reset-salt')
            reset_url = url_for('reset_password', token=token, _external=True)
            # Send email
            msg = Message('Password Reset Request',
                          sender='noreply@example.com',
                          recipients=[email])
            msg.body = f'Reset your password using this link: {reset_url}'
            mail.send(msg)
            flash('Password reset link has been sent to your email.', 'info')
        else:
            flash('Email address not found.', 'danger')
    return render_template('reset_password_request.html')

@app.route('/reset_password/<token>', methods=['GET', 'POST'])
def reset_password(token):
    try:
        email = serializer.loads(token, salt='password-reset-salt', max_age=3600)
    except Exception as e:
        flash('The password reset link is invalid or has expired.', 'danger')
        return redirect(url_for('login'))

    if request.method == 'POST':
        password = request.form['password']
        user = User.query.filter_by(email=email).first()
        if user:
            hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
            user.password = hashed_password
            db.session.commit()
            flash('Your password has been updated!', 'success')
            return redirect(url_for('login'))
        else:
            flash('User not found.', 'danger')
            return redirect(url_for('login'))
    
    return render_template('reset_password.html', token=token)

@app.route('/campaigns')
def campaigns():
    if 'username' not in session:
        return redirect(url_for('login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('campaigns.html', campaigns=user.campaigns)

@app.route('/add_campaign', methods=['POST'])
def add_campaign():
    if 'username' not in session:
        return redirect(url_for('login'))
    user = User.query.filter_by(username=session['username']).first()
    name = request.form['name']
    new_campaign = Campaign(name=name, user=user)
    db.session.add(new_campaign)
    db.session.commit()
    return redirect(url_for('campaigns'))

@app.route('/main')
def main():
    if 'username' not in session:
        return redirect(url_for('login'))
    user = User.query.filter_by(username=session['username']).first()
    return render_template('main.html', phase='planning', campaigns=user.campaigns)

@app.route('/logout')
def logout():
    session.pop('username', None)
    return redirect(url_for('landing_page'))
gma = GameMastersAssistant()

@app.route('/')
def index():
    campaigns = get_user_campaigns()
    return render_template('main.html', campaigns=campaigns)

@app.route('/planning')
def planning():
    campaigns = get_user_campaigns()
    return render_template('planning.html', campaigns=campaigns)

@app.route('/playing')
def playing():
    campaigns = get_user_campaigns()
    return render_template('playing.html', campaigns=campaigns)

@app.route('/review')
def review():
    campaigns = get_user_campaigns()
    return render_template('review.html', campaigns=campaigns)

def get_user_campaigns():
    # Dummy data for campaigns, replace with actual user campaigns
    return [
        {"name": "Campaign 1"},
        {"name": "Campaign 2"},
        {"name": "Campaign 3"}
    ]


@socketio.on('get_story_idea')
def handle_get_story_idea():
    idea = gma.get_story_idea()
    emit('story_idea', idea)

@socketio.on('get_rule_clarification')
def handle_get_rule_clarification(data):
    query = data['query']
    clarification = gma.get_rule_clarification(query)
    emit('rule_clarification', clarification)

@socketio.on('get_npc_dialogue')
def handle_get_npc_dialogue(data):
    npc_name = data['npc_name']
    dialogue = gma.get_npc_dialogue(npc_name)
    emit('npc_dialogue', dialogue)

@socketio.on('get_lore_info')
def handle_get_lore_info(data):
    topic = data['topic']
    info = gma.get_lore_info(topic)
    emit('lore_info', info)

if __name__ == '__main__':
    app.run(debug=True)
