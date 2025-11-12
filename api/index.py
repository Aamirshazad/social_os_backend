"""
Vercel Entry Point for FastAPI Application
"""
import sys
import os

# Add the parent directory to Python path for imports
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

try:
    from app.main import app
    # Export the FastAPI app as handler for Vercel
    handler = app
except ImportError as e:
    # Fallback simple FastAPI app for debugging
    from fastapi import FastAPI
    
    fallback_app = FastAPI(title="Debug API")
    
    @fallback_app.get("/")
    async def root():
        return {"message": "Fallback API is working", "error": str(e)}
    
    @fallback_app.get("/health")
    async def health():
        return {"status": "fallback", "import_error": str(e)}
    
    handler = fallback_app
