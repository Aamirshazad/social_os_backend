# FastAPI Backend - Quick Start Guide

## 🚀 Get Started in 5 Minutes

### 1. Install Dependencies
```bash
cd backend
python -m venv venv
# Windows
venv\Scripts\activate
# Linux/Mac
source venv/bin/activate

pip install -r requirements.txt
```

### 2. Configure Environment
```bash
# Copy example environment file
copy .env.example .env

# Edit .env and add your API keys:
GEMINI_API_KEY=your-key-here
OPENAI_API_KEY=your-key-here
DATABASE_URL=your-database-url
```

### 3. Run the Server
```bash
# Option 1: Using the start script (recommended)
start.bat  # Windows
./start.sh  # Linux/Mac

# Option 2: Direct command
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

### 4. Test the API
- **API Docs**: http://localhost:8000/docs
- **Health Check**: http://localhost:8000/health
- **API Base**: http://localhost:8000/api/v1

---

## 📋 Quick Test Request

### Generate Content
```bash
curl -X POST "http://localhost:8000/api/v1/ai/content/generate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "topic": "AI in healthcare",
    "platforms": ["twitter", "linkedin"],
    "content_type": "engaging",
    "tone": "professional"
  }'
```

### Expected Response
```json
{
  "success": true,
  "data": {
    "twitter": "AI-powered content...",
    "linkedin": "Professional content...",
    "imageSuggestion": "...",
    "videoSuggestion": "..."
  },
  "message": "Content generated successfully"
}
```

---

## 🔑 Key Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/health` | GET | Health check |
| `/api/v1/auth/login` | POST | User login |
| `/api/v1/posts` | GET | List posts |
| `/api/v1/posts` | POST | Create post |
| `/api/v1/ai/content/generate` | POST | Generate content |
| `/api/v1/ai/content/engagement` | POST | Analyze engagement |
| `/api/v1/ai/media/image/generate` | POST | Generate image |
| `/api/v1/ai/campaigns/brief` | POST | Campaign brief |
| `/api/v1/ai/content/repurpose` | POST | Repurpose content |
| `/api/v1/ai/content/strategist/chat` | POST | AI chat |

---

## 🐳 Docker Quick Start

```bash
# Build and run
docker-compose up -d

# View logs
docker-compose logs -f backend

# Stop
docker-compose down
```

---

## 🔧 Configuration Checklist

- [x] Python 3.11+ installed
- [ ] Virtual environment created
- [ ] Dependencies installed
- [ ] `.env` file configured
- [ ] GEMINI_API_KEY set
- [ ] OPENAI_API_KEY set
- [ ] DATABASE_URL set
- [ ] SECRET_KEY generated
- [ ] ENCRYPTION_KEY generated

---

## ⚡ Performance Tips

1. **Use Redis**: Configure `REDIS_URL` for caching
2. **Connection Pooling**: Adjust `DATABASE_POOL_SIZE`
3. **Worker Processes**: Run with multiple workers in production
   ```bash
   uvicorn app.main:app --workers 4 --host 0.0.0.0 --port 8000
   ```

---

## 🐛 Troubleshooting

### API Key Errors
```
Error: "GEMINI_API_KEY environment variable is not set"
Solution: Add key to .env file
```

### Database Connection Failed
```
Error: "Connection refused"
Solution: Check DATABASE_URL and ensure PostgreSQL is running
```

### Import Errors
```
Error: "ModuleNotFoundError"
Solution: Ensure virtual environment is activated and dependencies installed
```

---

## 📚 Documentation

- **Interactive API Docs**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Migration Guide**: See `FASTAPI_MIGRATION_PLAN.md`
- **Feature Comparison**: See `MIGRATION_COMPARISON.md`

---

## 🎯 Next Steps

1. ✅ Server running
2. [ ] Test authentication endpoints
3. [ ] Test content generation
4. [ ] Connect frontend
5. [ ] Deploy to production

---

**Need Help?** Check the full `README.md` or compare with original implementation in `MIGRATION_COMPARISON.md`
