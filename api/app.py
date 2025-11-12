"""
Minimal Vercel Test
"""
from fastapi import FastAPI

# Create a minimal FastAPI app for testing
app = FastAPI(title="Vercel Test API")

@app.get("/")
async def root():
    return {
        "message": "Hello from Vercel!", 
        "status": "working",
        "framework": "FastAPI"
    }

@app.get("/health")
async def health():
    return {"status": "healthy", "service": "vercel-test"}

@app.get("/test")
async def test():
    return {"test": "endpoint working"}

# Export for Vercel
handler = app
