import sys
import os

sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager
from flask_socketio import SocketIO
from flask_migrate import Migrate
from config import Config
from models import db, bcrypt, init_app as init_models, User

socketio = SocketIO()

def create_app(config_class=Config):
    app = Flask(__name__)
    app.config.from_object(config_class)
    
    # Enable debug mode and detailed error reporting
    app.config['DEBUG'] = True
    app.config['TESTING'] = True
    app.config['PROPAGATE_EXCEPTIONS'] = True
    
    # Initialize extensions
    init_models(app)
    socketio.init_app(app)
    
    # Initialize Flask-Migrate
    migrate = Migrate(app, db)
    
    # Setup Login Manager
    login_manager = LoginManager()
    login_manager.init_app(app)
    login_manager.login_view = 'auth.login'

    @login_manager.user_loader
    def load_user(user_id):
        return User.query.get(int(user_id))

    # Import blueprints here to avoid circular imports
    with app.app_context():
        from main.routes import main_bp
        from auth.routes import auth_bp
        
        # Register blueprints
        app.register_blueprint(main_bp)
        app.register_blueprint(auth_bp)

    return app
