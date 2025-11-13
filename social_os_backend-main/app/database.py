"""
Database configuration and session management
"""
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import AsyncGenerator
import structlog
import os

logger = structlog.get_logger()

# Get database URL directly from environment variable (like Supabase client)
supabase_db_url = os.getenv("SUPABASE_DB_URL")

if not supabase_db_url:
    raise ValueError("SUPABASE_DB_URL environment variable is not configured")

logger.info(
    "database_configuration",
    database_url_configured=True,
    message="Using SUPABASE_DB_URL from environment"
)

# Convert to async URL if needed
async_database_url = supabase_db_url
if "postgresql://" in async_database_url and "postgresql+asyncpg://" not in async_database_url:
    async_database_url = async_database_url.replace("postgresql://", "postgresql+asyncpg://")

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
