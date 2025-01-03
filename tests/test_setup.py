def test_imports():
    """Test all major package imports."""
    try:
        # Core Flask
        import flask
        from flask_sqlalchemy import SQLAlchemy
        from flask_migrate import Migrate
        from flask_login import LoginManager
        from flask_bcrypt import Bcrypt
        from flask_socketio import SocketIO
        
        # AI and Speech
        import openai
        import azure.cognitiveservices.speech as speechsdk
        
        # Discord
        import discord
        
        print("All imports successful!")
        return True
    except ImportError as e:
        print(f"Import error: {e}")
        return False

if __name__ == "__main__":
    test_imports()
