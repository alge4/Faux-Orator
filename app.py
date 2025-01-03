from flask import Flask, render_template
from config import Config
from gma.routes import gma_bp
from __init__ import create_app, socketio

app = create_app()
app.config.from_object(Config)

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
    socketio.run(app)
