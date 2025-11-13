#!/usr/bin/env python3
"""
Production startup script for Render deployment
"""
import os
import uvicorn

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8000))
    host = os.environ.get("HOST", "0.0.0.0")
    
    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        workers=1,  # Single worker for starter plan
        log_level="info",
        access_log=True,
    )
