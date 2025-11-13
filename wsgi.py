"""
WSGI entry point for Gunicorn deployment
This file avoids naming conflicts with the app/ directory
"""
from app.main import app

# Export the app for Gunicorn
__all__ = ["app"]
