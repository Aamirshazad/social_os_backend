# FastAPI Deployment on Vercel

## Prerequisites

1. **GitHub Repository**: Push your backend code to GitHub
2. **Vercel Account**: Sign up at [vercel.com](https://vercel.com)
3. **Environment Variables**: Prepare your production environment variables

## Deployment Steps

### Option 1: Deploy via Vercel Dashboard (Recommended)

1. **Connect GitHub Repository**
   - Go to [vercel.com/dashboard](https://vercel.com/dashboard)
   - Click "New Project"
   - Import your GitHub repository
   - Select the `backend` folder as the root directory

2. **Configure Build Settings**
   - Framework Preset: `Other`
   - Root Directory: `backend`
   - Build Command: (leave empty)
   - Output Directory: (leave empty)

3. **Set Environment Variables**
   ```
   DATABASE_URL=your_production_database_url
   SECRET_KEY=your_secret_key
   OPENAI_API_KEY=your_openai_key
   GOOGLE_AI_API_KEY=your_google_ai_key
   SUPABASE_URL=your_supabase_url
   SUPABASE_KEY=your_supabase_key
   ENVIRONMENT=production
   DEBUG=false
   ```

4. **Deploy**
   - Click "Deploy"
   - Vercel will automatically detect the FastAPI app and deploy it

### Option 2: Deploy via Vercel CLI

1. **Install Vercel CLI**
   ```bash
   npm install -g vercel
   ```

2. **Login to Vercel**
   ```bash
   vercel login
   ```

3. **Deploy from Backend Directory**
   ```bash
   cd backend
   vercel --prod
   ```

4. **Set Environment Variables**
   ```bash
   vercel env add DATABASE_URL production
   vercel env add SECRET_KEY production
   vercel env add OPENAI_API_KEY production
   # ... add all other environment variables
   ```

## Important Configuration Notes

### Database Considerations
- **PostgreSQL**: Use a managed PostgreSQL service (Supabase, Neon, PlanetScale)
- **Connection Pooling**: Enable connection pooling for better performance
- **Migrations**: Run database migrations separately, not during deployment

### Environment Variables Required
```env
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
SECRET_KEY=your-secret-key-here
JWT_SECRET_KEY=your-jwt-secret-key

# AI Services
OPENAI_API_KEY=your-openai-api-key
GOOGLE_AI_API_KEY=your-google-ai-api-key

# Supabase
SUPABASE_URL=your-supabase-url
SUPABASE_KEY=your-supabase-anon-key

# Social Media APIs
TWITTER_API_KEY=your-twitter-api-key
TWITTER_API_SECRET=your-twitter-api-secret
FACEBOOK_APP_ID=your-facebook-app-id
FACEBOOK_APP_SECRET=your-facebook-app-secret

# Application Settings
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
BACKEND_CORS_ORIGINS=["https://your-frontend-domain.vercel.app"]
```

### Vercel Function Limitations
- **Execution Time**: Maximum 30 seconds per request
- **Memory**: 1024MB maximum
- **Bundle Size**: 250MB maximum
- **Cold Starts**: First request may be slower

### Performance Optimization
1. **Use Connection Pooling**: Configure database connection pooling
2. **Enable Caching**: Use Redis or in-memory caching where possible
3. **Optimize Dependencies**: Use `requirements-vercel.txt` for lighter builds
4. **Static Assets**: Serve static files from CDN

## Post-Deployment

### 1. Update Frontend Configuration
Update your frontend's API URL to point to the Vercel deployment:
```env
NEXT_PUBLIC_API_URL=https://your-backend.vercel.app
```

### 2. Test API Endpoints
- Health Check: `https://your-backend.vercel.app/health`
- API Docs: `https://your-backend.vercel.app/docs`
- API Schema: `https://your-backend.vercel.app/api/v1/openapi.json`

### 3. Monitor Performance
- Check Vercel Analytics dashboard
- Monitor function execution times
- Set up error tracking (Sentry, etc.)

## Troubleshooting

### Common Issues
1. **Import Errors**: Ensure all dependencies are in requirements.txt
2. **Database Connection**: Verify DATABASE_URL and connection pooling
3. **Environment Variables**: Double-check all required env vars are set
4. **CORS Issues**: Update BACKEND_CORS_ORIGINS with your frontend domain
5. **Cold Starts**: Consider using Vercel Pro for better performance

### Debugging
- Check Vercel function logs in the dashboard
- Use `vercel logs` CLI command
- Enable debug logging temporarily

## Continuous Deployment

Once connected to GitHub, Vercel will automatically:
- Deploy on every push to main branch
- Create preview deployments for pull requests
- Run builds and tests automatically

## Security Checklist
- [ ] All sensitive data in environment variables
- [ ] CORS properly configured
- [ ] Rate limiting enabled
- [ ] Input validation implemented
- [ ] HTTPS enforced
- [ ] Database credentials secured
