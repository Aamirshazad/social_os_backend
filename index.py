"""
Vercel Entry Point for FastAPI Application
"""
from app.main import app

# Export the FastAPI app for Vercel
# Vercel will automatically detect this and serve it as a serverless function
