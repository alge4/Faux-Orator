# gma/__init__.py
from flask import Blueprint
from . import models
from . import agents, routes

gma_bp = Blueprint('gma', __name__)

from . import routes
