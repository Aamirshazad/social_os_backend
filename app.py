"""
Deployment entry point for Gunicorn
This file ensures compatibility with deployment systems that expect app:app
"""
from app.main import app

# Export the app for Gunicorn
__all__ = ["app"]
