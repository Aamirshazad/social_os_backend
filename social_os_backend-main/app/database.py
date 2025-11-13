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

logger.info(
    "database_configuration",
    database_configured=True,
    message="Using SUPABASE_URL and SUPABASE_KEY from environment"
)

# Create Supabase client for API operations
supabase_client = create_client(supabase_url, supabase_key)

# Extract project ref from Supabase URL for direct PostgreSQL connection
# Format: https://[project-ref].supabase.co
project_ref = supabase_url.replace("https://", "").replace(".supabase.co", "")

# For direct database access, construct async PostgreSQL connection string
# Using the service role key as password (from Supabase settings)
service_role_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY")
if service_role_key:
    # Use service role key as the database password
    async_database_url = f"postgresql+asyncpg://postgres:{service_role_key}@db.{project_ref}.supabase.co:5432/postgres?sslmode=require"
else:
    # Fallback: construct a basic connection (will fail if service role key not set)
    async_database_url = f"postgresql+asyncpg://postgres:@db.{project_ref}.supabase.co:5432/postgres?sslmode=require"
    logger.warning("SUPABASE_SERVICE_ROLE_KEY not configured, direct database access may fail")

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
        "ssl": "require",
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
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


async def init_async_db():
    """
    Initialize async database
    Creates all tables defined in models using async engine
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
