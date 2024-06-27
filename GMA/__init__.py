# gma/__init__.py
from flask import Blueprint

gma_bp = Blueprint('gma', __name__)

from . import agents, routes
