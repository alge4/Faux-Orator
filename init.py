# init.py
from flask import Flask
from flask_bcrypt import Bcrypt
from flask_migrate import Migrate
from flask_mail import Mail
from flask_socketio import SocketIO
from config import Config
from models import db

bcrypt = Bcrypt()
migrate = Migrate()
mail = Mail()
socketio = SocketIO()

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    db.init_app(app)
    bcrypt.init_app(app)
    migrate.init_app(app, db)
    mail.init_app(app)
    socketio.init_app(app)

    from auth.routes import auth_bp
    from main.routes import main_bp
    from gma.routes import gma_bp

    app.register_blueprint(auth_bp)
    app.register_blueprint(main_bp)
    app.register_blueprint(gma_bp)

    with app.app_context():
        db.create_all()

    return app
