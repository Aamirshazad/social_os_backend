# Social Media AI System - FastAPI Backend

Modern, scalable FastAPI backend for the Social Media AI System with AI-powered content generation, multi-platform publishing, and comprehensive API.

## Features

### 🤖 AI-Powered Content Generation
- Multi-platform content generation (Twitter, LinkedIn, Facebook, Instagram, TikTok, YouTube)
- Google Gemini AI integration for text generation
- OpenAI DALL-E 3 for image generation
- Content engagement analysis and optimization
- Campaign brief generation
- AI content strategist chatbot

### 📱 Multi-Platform Support
- Twitter/X
- LinkedIn
- Facebook
- Instagram
- TikTok
- YouTube

### 🔐 Authentication & Security
- JWT-based authentication
- Refresh token support
- OAuth2 integration for social platforms
- Encrypted credential storage
- Role-based access control

### 📊 Content Management
- Post creation and scheduling
- Draft management
- Campaign organization
- Content library/archive
- Engagement tracking

### ⚡ Performance
- Async operations throughout
- Redis caching
- Celery background tasks
- Database connection pooling
- Response compression

## Tech Stack

- **Framework:** FastAPI 0.115.0 (Latest)
- **Python:** 3.11+
- **Database:** PostgreSQL (via Supabase)
- **Cache/Queue:** Redis
- **Task Queue:** Celery
- **ORM:** SQLAlchemy 2.0
- **AI Services:**
  - Google Gemini AI
  - OpenAI (DALL-E 3)
- **Authentication:** JWT (python-jose)
- **Logging:** Structlog

## Project Structure

```
backend/
├── app/
│   ├── api/
│   │   └── v1/
│   │       ├── ai.py          # AI endpoints
│   │       ├── auth.py        # Authentication
│   │       └── posts.py       # Post management
│   ├── core/
│   │   ├── exceptions.py      # Custom exceptions
│   │   ├── middleware.py      # Middleware
│   │   └── security.py        # Auth & encryption
│   ├── models/                # SQLAlchemy models
│   ├── schemas/               # Pydantic schemas
│   ├── services/              # Business logic
│   │   ├── ai/
│   │   │   ├── gemini_service.py
│   │   │   └── openai_service.py
│   │   └── post_service.py
│   ├── utils/                 # Utilities
│   ├── config.py              # Configuration
│   ├── database.py            # Database setup
│   ├── dependencies.py        # Dependency injection
│   └── main.py                # App entry point
├── tests/                     # Test suite
├── alembic/                   # Database migrations
├── .env.example               # Environment template
├── requirements.txt           # Dependencies
├── Dockerfile                 # Docker image
├── docker-compose.yml         # Docker compose
└── README.md                  # This file
```

## Getting Started

### Prerequisites

- Python 3.11+
- PostgreSQL (or Supabase account)
- Redis
- Google Gemini API key
- OpenAI API key

### Installation

1. **Clone the repository**
```bash
cd backend
```

2. **Create virtual environment**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**
```bash
cp .env.example .env
# Edit .env with your configuration
```

5. **Run database migrations**
```bash
alembic upgrade head
```

6. **Start the server**
```bash
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

The API will be available at: `http://localhost:8000`

API Documentation: `http://localhost:8000/docs`

### Docker Setup

1. **Build and start services**
```bash
docker-compose up -d
```

2. **View logs**
```bash
docker-compose logs -f backend
```

3. **Stop services**
```bash
docker-compose down
```

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/dbname

# Supabase
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Security
SECRET_KEY=your-secret-key-min-32-chars
ENCRYPTION_KEY=your-encryption-key-min-32-chars

# AI Services
GEMINI_API_KEY=your-gemini-api-key
OPENAI_API_KEY=your-openai-api-key

# Redis
REDIS_URL=redis://localhost:6379/0

# Social Platform OAuth
TWITTER_CLIENT_ID=your-client-id
TWITTER_CLIENT_SECRET=your-client-secret
LINKEDIN_CLIENT_ID=your-client-id
LINKEDIN_CLIENT_SECRET=your-client-secret
# ... etc
```

## API Endpoints

### Authentication
- `POST /api/v1/auth/login` - Login
- `POST /api/v1/auth/refresh` - Refresh token
- `POST /api/v1/auth/logout` - Logout

### Posts
- `GET /api/v1/posts` - List all posts
- `POST /api/v1/posts` - Create post
- `GET /api/v1/posts/{id}` - Get post
- `PUT /api/v1/posts/{id}` - Update post
- `DELETE /api/v1/posts/{id}` - Delete post
- `PATCH /api/v1/posts/{id}/status` - Update status
- `GET /api/v1/posts/scheduled/pending` - Get scheduled posts

### AI Services
- `POST /api/v1/ai/content/generate` - Generate content
- `POST /api/v1/ai/content/engagement` - Analyze engagement
- `POST /api/v1/ai/content/repurpose` - Repurpose content
- `POST /api/v1/ai/media/image/generate` - Generate image
- `POST /api/v1/ai/media/image/edit` - Edit image
- `POST /api/v1/ai/media/video/generate` - Generate video
- `GET /api/v1/ai/media/video/{id}/status` - Video status
- `POST /api/v1/ai/campaigns/brief` - Generate campaign brief
- `POST /api/v1/ai/campaigns/ideas` - Generate ideas
- `POST /api/v1/ai/prompts/improve` - Improve prompt
- `POST /api/v1/ai/content/strategist/chat` - AI strategist chat

Full API documentation available at `/docs` when server is running.

## Development

### Running Tests
```bash
pytest
pytest --cov=app tests/  # With coverage
```

### Code Formatting
```bash
black app/
isort app/
```

### Linting
```bash
flake8 app/
pylint app/
```

### Database Migrations

Create a new migration:
```bash
alembic revision --autogenerate -m "description"
```

Apply migrations:
```bash
alembic upgrade head
```

Rollback:
```bash
alembic downgrade -1
```

### Running Celery Worker
```bash
celery -A app.tasks.celery worker -l info
```

## Deployment

### Production Checklist

- [ ] Set `DEBUG=False`
- [ ] Use strong `SECRET_KEY` and `ENCRYPTION_KEY`
- [ ] Set up SSL/TLS
- [ ] Configure CORS properly
- [ ] Set up monitoring (Sentry, DataDog, etc.)
- [ ] Configure log aggregation
- [ ] Set up automated backups
- [ ] Use environment-specific settings
- [ ] Enable rate limiting
- [ ] Set up CI/CD pipeline

### Deployment Options

1. **Docker + Cloud Run/ECS/Kubernetes**
   - Build image: `docker build -t social-media-backend .`
   - Push to registry
   - Deploy to cloud platform

2. **Traditional VPS**
   - Use systemd service
   - Nginx reverse proxy
   - Let's Encrypt SSL

3. **Platform-as-a-Service**
   - Railway, Render, Heroku
   - Follow platform-specific guides

## Performance Optimization

- Database query optimization
- Redis caching for frequently accessed data
- Background job processing with Celery
- Connection pooling
- Response compression
- Rate limiting

## Security Considerations

- JWT tokens with expiration
- Encrypted OAuth credentials
- SQL injection protection (SQLAlchemy)
- CORS configuration
- Input validation (Pydantic)
- Rate limiting
- Secure headers

## Monitoring & Logging

- Structured JSON logging (Structlog)
- Health check endpoint: `/health`
- Request/response logging
- Error tracking integration ready
- Performance metrics

## Troubleshooting

### Common Issues

**Database connection errors:**
- Check DATABASE_URL is correct
- Ensure PostgreSQL is running
- Verify network connectivity

**AI API errors:**
- Verify API keys are set
- Check API rate limits
- Review API documentation

**Redis connection errors:**
- Ensure Redis is running
- Check REDIS_URL
- Verify Redis password if set

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write/update tests
5. Submit a pull request

## License

[Your License Here]

## Support

For issues and questions:
- GitHub Issues
- Email: [your-email]
- Documentation: [docs-link]

## Roadmap

- [ ] WebSocket support for real-time updates
- [ ] Advanced analytics endpoints
- [ ] Video generation integration
- [ ] More AI model options
- [ ] Enhanced caching strategies
- [ ] GraphQL API option
- [ ] Webhook support
- [ ] Advanced scheduling features

---

Built with ❤️ using FastAPI 0.115.0
