#!/bin/bash

# Social Media AI System - Backend Startup Script

echo "🚀 Starting Social Media AI Backend..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Install/upgrade dependencies
echo "📥 Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

# Check if .env exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Copying from .env.example..."
    cp .env.example .env
    echo "⚙️  Please edit .env with your configuration before running the server."
    exit 1
fi

# Run database migrations (if alembic is configured)
if [ -d "alembic" ]; then
    echo "🗄️  Running database migrations..."
    alembic upgrade head
fi

# Start the server
echo "🌟 Starting FastAPI server..."
echo "📖 API Documentation will be available at: http://localhost:8000/docs"
echo "🔍 Health Check: http://localhost:8000/health"
echo ""

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
