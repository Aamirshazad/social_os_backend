# ðŸš€ Social Media OS

A comprehensive social media management platform that allows you to manage multiple social media accounts, post picture , video,schedule posts, generate AI content, and track analytics - all from one unified dashboard.

## ðŸŒ Live Demo

**Production**: [https://social-medias-os.vercel.app/](https://social-medias-os.vercel.app/)

## âœ¨ Features

### ðŸ“± Multi-Platform Support
- **Twitter/X** - Post, schedule, and track engagement
- **LinkedIn** - Professional content management
- **Instagram** - Photo and video sharing
- **Facebook** - Page and group management
- **Threads** - Quick updates and conversations

### ðŸ¤– AI-Powered Content
- Generate engaging post content with Google Gemini AI
- AI-assisted captions and hashtags
- Content suggestions based on trends

### ðŸ“… Smart Scheduling
- Schedule posts across all platforms
- Optimal posting time recommendations
- Bulk scheduling capabilities
- Calendar view for content planning

### ðŸ“Š Analytics & Insights
- Real-time engagement metrics
- Cross-platform performance tracking
- Audience insights
- Export reports

### ðŸ‘¥ Team Collaboration
- Multi-user workspaces
- Role-based permissions (Admin, Editor, Viewer)
- Approval workflows
- Activity logs and audit trail

### ðŸ“ Media Library
- Centralized media asset management
- AI-generated images
- Tag-based organization
- Cloud storage integration

### ðŸŽ¯ Campaign Management
- Organize posts into campaigns
- Track campaign performance
- Color-coded organization
- Date range tracking

## ðŸ› ï¸ Tech Stack

- **Frontend**: Next.js 16, React 19, TailwindCSS 4
- **Backend**: Next.js API Routes
- **Database**: Supabase (PostgreSQL)
- **Authentication**: Supabase Auth
- **AI**: Google Gemini API
- **Storage**: Supabase Storage
- **Deployment**: Vercel
- **Icons**: Lucide React
- **Charts**: Recharts

## ðŸ“¦ Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Supabase account
- Social media API credentials

### Local Development Setup

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd social_media_os
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   - Copy `.env.example` to `.env`
   - Update with your credentials (see `.env` file)

4. **Set up Supabase database**
   - Follow instructions in `SUPABASE_SETUP.md`
   - Run the SQL schema from `src/lib/supabase/schema.sql`

5. **Run development server**
   ```bash
   npm run dev
   ```


## ðŸš€ Deployment
UPDATE public.users
  SET role = 'admin'
  WHERE email = 'your-email@example.com'
  AND workspace_id = (
    SELECT id FROM public.workspaces
    ORDER BY created_at DESC LIMIT 1
  );

## ðŸ”‘ Environment Variables

Required environment variables:

```bash
# AI Configuration
GEMINI_API_KEY=
NEXT_PUBLIC_GEMINI_API_KEY=

# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# Twitter/X
TWITTER_API_KEY=
TWITTER_API_SECRET=
TWITTER_BEARER_TOKEN=
Access_Token=
Access_Token_Secret=
Twitter_CLIENT_ID=
Twitter_CLIENT_SECRET=

# LinkedIn
LINKEDIN_CLIENT_ID=
LINKEDIN_CLIENT_SECRET=

# Instagram/Facebook
INSTAGRAM_CLIENT_ID=
INSTAGRAM_CLIENT_SECRET=
FACEBOOK_CLIENT_ID=
FACEBOOK_CLIENT_SECRET=

# Threads
THREADS_APP_ID=
THREADS_APP_SECRET=

# Application
NEXT_PUBLIC_APP_URL=https://social-medias-os.vercel.app/
```

## ðŸ—ï¸ Project Structure

```
social_media_os/
â”œâ”€â”€ src/
â”‚   â”œâ”€â”€ app/                    # Next.js app directory
â”‚   â”‚   â”œâ”€â”€ api/               # API routes
â”‚   â”‚   â”‚   â”œâ”€â”€ twitter/       # Twitter OAuth & posting
â”‚   â”‚   â”‚   â”œâ”€â”€ linkedin/      # LinkedIn integration
â”‚   â”‚   â”‚   â”œâ”€â”€ instagram/     # Instagram integration
â”‚   â”‚   â”‚   â”œâ”€â”€ facebook/      # Facebook integration
â”‚   â”‚   â”‚   â””â”€â”€ threads/       # Threads integration
â”‚   â”‚   â”œâ”€â”€ auth/              # Authentication pages
â”‚   â”‚   â”œâ”€â”€ dashboard/         # Main dashboard
â”‚   â”‚   â””â”€â”€ ...
â”‚   â”œâ”€â”€ components/            # React components
â”‚   â”œâ”€â”€ lib/                   # Utility libraries
â”‚   â”‚   â”œâ”€â”€ supabase/         # Database client & schema
â”‚   â”‚   â”œâ”€â”€ twitter/          # Twitter client
â”‚   â”‚   â”œâ”€â”€ linkedin/         # LinkedIn client
â”‚   â”‚   â””â”€â”€ ...
â”‚   â””â”€â”€ types/                # TypeScript types
â”œâ”€â”€ public/                    # Static assets
â”œâ”€â”€ .env                       # Environment variables
â”œâ”€â”€ next.config.mjs           # Next.js configuration
â”œâ”€â”€ vercel.json               # Vercel configuration
â””â”€â”€ package.json              # Dependencies
```

## ðŸ” Security Features

- **Row Level Security (RLS)** - Database-level access control
- **Multi-tenancy** - Complete workspace isolation
- **Encrypted credentials** - Social media tokens stored securely
- **Role-based access** - Admin, Editor, Viewer permissions
- **Activity logging** - Audit trail for all actions
- **HTTPS only** - Enforced secure connections

## ðŸ§ª Testing

Test all features after deployment:

1. **Authentication**
   - Sign up / Login / Logout
   - Password reset

2. **Social Media Connections**
   - Connect each platform
   - Verify OAuth flow
   - Check token storage

3. **Post Management**
   - Create posts
   - Schedule posts
   - Publish to platforms
   - View analytics

4. **Team Features**
   - Invite users
   - Test permissions
   - Approval workflows

## ðŸ› Troubleshooting

### Common Issues

**OAuth Callback Errors**
- Verify callback URLs match exactly in platform settings
- Check environment variables are set correctly
- Wait 5-10 minutes after updating OAuth settings

**Database Connection Issues**
- Verify Supabase URL and key
- Check RLS policies are enabled
- Ensure schema is properly deployed

**AI Generation Fails**
- Verify Gemini API key is valid
- Check API quota limits
- Review API key permissions

See `DEPLOYMENT_GUIDE.md` for more troubleshooting tips.

## ðŸ“ License

MIT License - See LICENSE file for details

## ðŸ¤ Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## ðŸ“§ Support

For issues and questions:
- Open an issue on GitHub
- Documentation index: `docs/README.md`
- Review troubleshooting guides

## ðŸŽ‰ Acknowledgments

Built with:
- [Next.js](https://nextjs.org/)
- [Supabase](https://supabase.com/)
- [Vercel](https://vercel.com/)
- [Google Gemini AI](https://ai.google.dev/)
- [TailwindCSS](https://tailwindcss.com/)

---

**Made with â¤ï¸ for social media managers and content creators**

1. Go to https://www.linkedin.com/developers
  2. Select your app
  3. Find "Authorized redirect URLs"
  4. Add: https://social-medias-os.vercel.app/api/auth/oauth/linkedin/callback
  5. Save

  Twitter/X:

  1. Go to https://developer.twitter.com/en/portal/dashboard
  2. Select your app
  3. Find "Callback URLs" or "Redirect URI"
  4. Add: https://social-medias-os.vercel.app/api/auth/oauth/twitter/callback

  Facebook:

  1. Go to https://developers.facebook.com/apps
  2. Select your app
  3. Settings â†’ Basic
  4. Find "App Domains" and add: social-medias-os.vercel.app
  5. Go to Settings â†’ Advanced
  6. Find "Valid OAuth Redirect URIs"
  7. Add: https://social-medias-os.vercel.app/api/auth/oauth/facebook/callback
         - https://social-medias-os.vercel.app/api/auth/oauth/instagram/callback/
              

  Instagram:
