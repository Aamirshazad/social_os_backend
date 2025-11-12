@echo off
REM Social Media AI System - Backend Startup Script for Windows

echo 🚀 Starting Social Media AI Backend...

REM Check if virtual environment exists
if not exist "venv\" (
    echo 📦 Creating virtual environment...
    python -m venv venv
)

REM Activate virtual environment
echo ✅ Activating virtual environment...
call venv\Scripts\activate.bat

REM Install/upgrade dependencies
echo 📥 Installing dependencies...
python -m pip install --upgrade pip
pip install -r requirements.txt

REM Check if .env exists
if not exist ".env" (
    echo ⚠️  .env file not found. Copying from .env.example...
    copy .env.example .env
    echo ⚙️  Please edit .env with your configuration before running the server.
    pause
    exit /b 1
)

REM Start the server
echo 🌟 Starting FastAPI server...
echo 📖 API Documentation will be available at: http://localhost:8000/docs
echo 🔍 Health Check: http://localhost:8000/health
echo.

uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
