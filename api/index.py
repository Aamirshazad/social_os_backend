"""
Vercel Entry Point for FastAPI Application
"""
from app.main import app

# Export the FastAPI app as handler for Vercel
# This is the entry point that Vercel will use
handler = app
