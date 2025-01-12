from flask import Blueprint, render_template, current_app
from flask_login import login_required, current_user
import traceback
import sys

main_bp = Blueprint('main', __name__)

@main_bp.route('/')
@login_required
def main():
    try:
        # Log that we're entering the route
        print("Entering main route")
        current_app.logger.info("Entering main route")

        # Log the current user
        print(f"Current user: {current_user}")
        current_app.logger.info(f"Current user: {current_user}")

        # Try to render with absolute minimum
        return render_template('main.html')
                             
    except Exception as e:
        error_info = {
            'type': type(e).__name__,
            'message': str(e),
            'traceback': traceback.format_exc()
        }
        
        # Print to console
        print("\n=== ERROR IN MAIN ROUTE ===")
        print(f"Error Type: {error_info['type']}")
        print(f"Error Message: {error_info['message']}")
        print("\nTraceback:")
        print(error_info['traceback'])
        print("===========================\n")
        
        # Log to application logger
        current_app.logger.error(f"Error Type: {error_info['type']}")
        current_app.logger.error(f"Error Message: {error_info['message']}")
        current_app.logger.error(f"Traceback: {error_info['traceback']}")
        
        raise
