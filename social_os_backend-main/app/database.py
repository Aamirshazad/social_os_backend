"""
Database configuration and session management
"""
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from typing import AsyncGenerator

from app.config import settings

# Get database URL (with Supabase fallback)
database_url = settings.get_database_url()

# Convert to async URL if needed
async_database_url = database_url
if "postgresql://" in async_database_url:
    async_database_url = async_database_url.replace("postgresql://", "postgresql+asyncpg://")
elif "postgresql+asyncpg://" not in async_database_url:
    # Assume it's a sync URL, convert it
    async_database_url = async_database_url.replace("postgresql://", "postgresql+asyncpg://")

# Create async engine only (FastAPI is async)
async_engine = create_async_engine(
    async_database_url,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    pool_recycle=3600,  # Recycle connections every hour
    connect_args={
        "server_settings": {
            "application_name": "social_media_ai_system",
        },
        "ssl": "require",
    },
    echo=settings.DEBUG,
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
