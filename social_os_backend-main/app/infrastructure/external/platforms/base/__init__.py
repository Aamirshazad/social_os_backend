"""
Base platform components
"""
from .platform_client import BasePlatformClient
from .oauth_handler import BaseOAuthHandler

__all__ = [
    "BasePlatformClient",
    "BaseOAuthHandler"
]
