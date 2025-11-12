"""
Vercel entry point for FastAPI application
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Create a simplified FastAPI app for Vercel
app = FastAPI(
    title="Social Media AI System",
    version="1.0.0",
    description="AI-powered social media management system backend"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Configure this properly in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Root endpoint
@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to Social Media AI System API",
        "version": "1.0.0",
        "status": "running",
        "platform": "vercel"
    }

# Health check endpoint
@app.get("/health")
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "version": "1.0.0",
        "platform": "vercel"
    }

# Test endpoint
@app.get("/api/test")
async def test_endpoint():
    """Test endpoint to verify Vercel deployment"""
    return {
        "message": "FastAPI on Vercel is working!",
        "status": "success",
        "platform": "vercel",
        "endpoints": {
            "root": "/",
            "health": "/health",
            "test": "/api/test"
        }
    }
