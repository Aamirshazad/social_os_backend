"""
Analytics models - Matches Supabase database schema
"""
from sqlalchemy import Column, Integer, BigInteger, Date, DateTime, Numeric, Enum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey
import enum

from app.models.base import BaseModel


class Platform(enum.Enum):
    """Social media platform enum"""
    TWITTER = "twitter"
    FACEBOOK = "facebook"
    INSTAGRAM = "instagram"
    LINKEDIN = "linkedin"
    TIKTOK = "tiktok"
    YOUTUBE = "youtube"


class PostAnalytics(BaseModel):
    """Post analytics model matching Supabase schema"""
    
    __tablename__ = "post_analytics"
    
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    platform = Column(Enum(Platform), nullable=False)
    impressions = Column(Integer, default=0)
    reach = Column(Integer, default=0)
    engagement_rate = Column(Numeric, default=0)
    clicks = Column(Integer, default=0)
    shares = Column(Integer, default=0)
    comments = Column(Integer, default=0)
    likes = Column(Integer, default=0)
    reposts = Column(Integer, default=0)
    replies = Column(Integer, default=0)
    saves = Column(Integer, default=0)
    engagement_total = Column(Integer, default=0)
    engagement = Column(Integer, default=0)
    fetched_at = Column(DateTime(timezone=True), nullable=True)
    
    # Relationships
    post = relationship("Post", back_populates="analytics")
    workspace = relationship("Workspace", back_populates="post_analytics")


class CampaignAnalytics(BaseModel):
    """Campaign analytics model matching Supabase schema"""
    
    __tablename__ = "campaign_analytics"
    
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=False)
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    metric_date = Column(Date, nullable=False)
    platform = Column(Enum(Platform), nullable=True)
    total_posts = Column(Integer, default=0)
    published_posts = Column(Integer, default=0)
    total_impressions = Column(BigInteger, default=0)
    total_engagement = Column(Integer, default=0)
    total_reach = Column(BigInteger, default=0)
    average_engagement_rate = Column(Numeric, default=0)
    
    # Relationships
    campaign = relationship("Campaign", back_populates="analytics")
    workspace = relationship("Workspace", back_populates="campaign_analytics")
