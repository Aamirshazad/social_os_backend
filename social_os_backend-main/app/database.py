"""
Database configuration and session management
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.pool import NullPool
from typing import Generator, AsyncGenerator

from app.config import settings

# Get database URL (with Supabase fallback)
database_url = settings.get_database_url()

# Create SQLAlchemy engine
engine = create_engine(
    database_url,
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,  # Enable connection health checks
    echo=settings.DEBUG,
)

# Create async engine
async_engine = create_async_engine(
    database_url.replace("postgresql://", "postgresql+asyncpg://"),
    pool_size=settings.DATABASE_POOL_SIZE,
    max_overflow=settings.DATABASE_MAX_OVERFLOW,
    pool_pre_ping=True,
    echo=settings.DEBUG,
)

# Create SessionLocal class
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Create async session class
AsyncSessionLocal = sessionmaker(
    class_=AsyncSession,
    autocommit=False,
    autoflush=False,
    bind=async_engine,
)

# Create Base class for models
Base = declarative_base()


def get_db() -> Generator:
    """
    Dependency function to get database session
    Yields a database session and ensures it's closed after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


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


def init_db():
    """
    Initialize database
    Creates all tables defined in models
    """
    Base.metadata.create_all(bind=engine)


async def init_async_db():
    """
    Initialize async database
    Creates all tables defined in models using async engine
    """
    async with async_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
