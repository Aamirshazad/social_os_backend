"""
A/B Test models - Matches Supabase database schema
"""
from sqlalchemy import Column, String, Integer, DateTime, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy import ForeignKey

from app.models.base import BaseModel


class ABTest(BaseModel):
    """A/B test model matching Supabase schema"""
    
    __tablename__ = "a_b_tests"
    
    workspace_id = Column(UUID(as_uuid=True), ForeignKey("workspaces.id"), nullable=False)
    campaign_id = Column(UUID(as_uuid=True), ForeignKey("campaigns.id"), nullable=True)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default='draft')
    test_type = Column(String, nullable=True)
    hypothesis = Column(Text, nullable=True)
    start_date = Column(DateTime(timezone=True), nullable=True)
    end_date = Column(DateTime(timezone=True), nullable=True)
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    
    # Relationships
    workspace = relationship("Workspace", back_populates="ab_tests")
    campaign = relationship("Campaign", back_populates="ab_tests")
    creator = relationship("User", back_populates="ab_tests")
    variants = relationship("ABTestVariant", back_populates="test")


class ABTestVariant(BaseModel):
    """A/B test variant model matching Supabase schema"""
    
    __tablename__ = "a_b_test_variants"
    
    test_id = Column(UUID(as_uuid=True), ForeignKey("a_b_tests.id"), nullable=False)
    post_id = Column(UUID(as_uuid=True), ForeignKey("posts.id"), nullable=False)
    variant_name = Column(String, nullable=True)
    variant_number = Column(Integer, nullable=True)
    description = Column(Text, nullable=True)
    
    # Relationships
    test = relationship("ABTest", back_populates="variants")
    post = relationship("Post", back_populates="ab_test_variants")
