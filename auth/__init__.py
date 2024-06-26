# auth/__init__.py

from flask import Blueprint

auth_bp = Blueprint('auth', __name__)

# Import routes so they are registered with the Blueprint
from . import routes
