from flask import Flask
from flask_migrate import Migrate
from flask_socketio import SocketIO
from __init__ import create_app, socketio
from models import db
import logging

# Set up logging
logging.basicConfig(level=logging.DEBUG)
logger = logging.getLogger(__name__)

app = create_app()  # create_app should handle db initialization
app.config['DEBUG'] = True  # Enable debug mode
migrate = Migrate(app, db)

@app.errorhandler(500)
def handle_500(error):
    app.logger.error(f'500 error: {error}')
    return 'Internal Server Error', 500

if __name__ == '__main__':
    socketio.run(app, debug=True)
