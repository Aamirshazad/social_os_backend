"""
Gunicorn entry point for deployment
This file exposes the FastAPI app for Gunicorn deployment
"""
from app.main import app

# Export the app for Gunicorn
__all__ = ["app"]
