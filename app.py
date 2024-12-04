from flask import Flask, render_template
from threading import Thread
from config import Config
from models import db
from discord.routes import discord_bp  # Import the blueprint
from gma.routes import gma_bp  # Add this import
from __init__ import create_app, socketio

app = create_app()
app.config.from_object(Config)

db.init_app(app)
app.register_blueprint(discord_bp, url_prefix='/discord')  # Register the blueprint
app.register_blueprint(gma_bp, url_prefix='/gma')  # Add this line

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/playing')
def playing():
    return render_template('playing.html')

@app.route('/planning')
def planning():
    return render_template('planning.html')

@app.route('/perpend')
def perpend():
    return render_template('perpend.html')

if __name__ == "__main__":
    Thread(target=run_discord_bot).start()
    socketio.run(app)
