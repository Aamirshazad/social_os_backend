"""
Database configuration and session management using Supabase
"""
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import AsyncGenerator
import structlog
import os
from supabase import create_client

logger = structlog.get_logger()

# Get Supabase credentials from environment (like Supabase client)
supabase_url = os.getenv("SUPABASE_URL")
supabase_key = os.getenv("SUPABASE_KEY")

if not supabase_url or not supabase_key:
    raise ValueError("SUPABASE_URL and SUPABASE_KEY environment variables are not configured")

# Extract project ref from Supabase URL for direct PostgreSQL connection
# Format: https://[project-ref].supabase.co
project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")

logger.info(
    "database_configuration",
    database_configured=True,
    message="Using SUPABASE_URL and SUPABASE_KEY from environment",
    project_ref=project_ref,
    database_url_env_set=bool(os.getenv("DATABASE_URL")),
    service_role_key_set=bool(os.getenv("SUPABASE_SERVICE_ROLE_KEY"))
)

# Create Supabase client for API operations
supabase_client = create_client(supabase_url, supabase_key)

# Since we're using Supabase for authentication only, we'll use a simple in-memory database for local models
# In production, you might want to use Supabase database or another PostgreSQL instance
database_url = os.getenv("DATABASE_URL")

if database_url:
    # Use provided DATABASE_URL if available
    if database_url.startswith("postgresql://"):
        async_database_url = database_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    elif database_url.startswith("postgres://"):
        async_database_url = database_url.replace("postgres://", "postgresql+asyncpg://", 1)
    else:
        async_database_url = database_url
    logger.info("using_database_url_from_environment", url_configured=True)
else:
    # Use SQLite for local development/testing when no DATABASE_URL is provided
    async_database_url = "sqlite+aiosqlite:///./social_media_ai.db"
    logger.info("using_sqlite_fallback", message="No DATABASE_URL provided, using SQLite")

# Create async engine only (FastAPI is async)
async_engine = create_async_engine(
    async_database_url,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
    connect_args={
        "server_settings": {
            "application_name": "social_media_ai_system",
        },
    },
    echo=False,
)

# Create async session class
AsyncSessionLocal = sessionmaker(
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    bind=async_engine,
)

# Create Base class for models
Base = declarative_base()


async def get_async_db() -> AsyncGenerator[AsyncSession, None]:
    """
    Dependency function to get async database session
    Yields an async database session and ensures it's closed after use
    """
    try:
        async with AsyncSessionLocal() as session:
            try:
                yield session
            finally:
                await session.close()
    except Exception as e:
        logger.error("database_session_creation_failed", error=str(e), error_type=type(e).__name__)
        raise


async def init_async_db():
    """
    Initialize async database
    Creates all tables defined in models using async engine
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
