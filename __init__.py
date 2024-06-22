from flask import Flask
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_mail import Mail
from flask_socketio import SocketIO
from flask_wtf import CSRFProtect
from config import Config
from models import db, User  # Ensure User is imported
from flask_login import LoginManager

bcrypt = Bcrypt()
migrate = Migrate()
mail = Mail()
socketio = SocketIO()
login_manager = LoginManager()
csrf = CSRFProtect()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    socketio.init_app(app)
    login_manager.init_app(app)
    csrf.init_app(app)

    login_manager.login_view = 'auth.login'
    login_manager.login_message_category = 'info'

    from auth.routes import auth_bp
    from main.routes import main_bp
    from gma.routes import gma_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(gma_bp)

    with app.app_context():
        db.create_all()

    return app

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))
