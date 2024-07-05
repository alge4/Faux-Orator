#config.py in the root directory
import os
from dotenv import load_dotenv

load_dotenv()

basedir = os.path.abspath(os.path.dirname(__file__))

class Config:
    SECRET_KEY = os.getenv('SECRET_KEY', 'default-secret-key')
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(basedir, 'instance', 'users.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    
    MAIL_SERVER = os.getenv('MAIL_SERVER', 'localhost')
    MAIL_PORT = int(os.getenv('MAIL_PORT', 25))
    MAIL_USE_TLS = os.getenv('MAIL_USE_TLS', 'False').lower() in ['true', '1', 't']
    MAIL_USERNAME = os.getenv('MAIL_USERNAME', None)
    MAIL_PASSWORD = os.getenv('MAIL_PASSWORD', None)

    # CSRF Protection
    WTF_CSRF_SECRET_KEY = os.getenv('WTF_CSRF_SECRET_KEY', 'a-csrf-secret-key')

    # OpenAI API Key
    OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', 'your-default-openai-api-key')

    # Microsoft OAuth Configuration
    MS_CLIENT_ID = os.getenv('MS_CLIENT_ID')
    MS_CLIENT_SECRET = os.getenv('MS_CLIENT_SECRET')
    MS_AUTHORITY = os.getenv('MS_AUTHORITY')
    #azure
    AZURE_SPEECH_KEY = os.getenv('AZURE_SPEECH_KEY')
    AZURE_SERVICE_REGION = os.getenv('AZURE_SERVICE_REGION')
    #discord
    DISCORD_TOKEN = os.getenv('DISCORD_TOKEN')
    
class TestConfig(Config):
    TESTING = True
    SECRET_KEY = 'test-secret-key'
    SQLALCHEMY_DATABASE_URI = f"sqlite:///{os.path.join(basedir, 'instance', 'test_users.db')}"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    WTF_CSRF_ENABLED = False
    MAIL_SUPPRESS_SEND = True