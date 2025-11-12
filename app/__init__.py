"""
App package initialization
Exports the FastAPI app for deployment compatibility
"""
from app.main import app

__all__ = ["app"]