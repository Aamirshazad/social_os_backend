"""
Minimal FastAPI for Vercel with proper ASGI setup
"""
from fastapi import FastAPI
from mangum import Mangum

# Create minimal FastAPI app
app = FastAPI()

@app.get("/")
def read_root():
    return {"message": "Hello from Vercel!", "status": "working"}

@app.get("/health")
def health():
    return {"status": "healthy"}

# Wrap FastAPI app with Mangum for serverless
handler = Mangum(app)
