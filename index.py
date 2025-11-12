"""
Vercel entry point for FastAPI application
"""
from app.main import app

# Add a simple test endpoint for Vercel
@app.get("/api/test")
async def test_endpoint():
    """Test endpoint to verify Vercel deployment"""
    return {
        "message": "FastAPI on Vercel is working!",
        "status": "success",
        "platform": "vercel"
    }

# This is the entry point that Vercel will use
# The app instance is imported from the main application module
