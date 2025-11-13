"""
API v1 Router
"""
from fastapi import APIRouter

# Create router instance
api_router = APIRouter()

def _setup_routes():
    """Setup routes lazily to avoid circular imports"""
    from . import (
        ai, posts, auth, workspaces, platforms, 
        library, campaigns, analytics, scheduler, oauth, media,
        invites, members, activity, threads
    )
    
    # Include sub-routers
    api_router.include_router(auth.router, prefix="/auth", tags=["authentication"])
    api_router.include_router(oauth.router, prefix="/oauth", tags=["oauth"])
    api_router.include_router(workspaces.router, prefix="/workspaces", tags=["workspaces"])
    api_router.include_router(invites.router, prefix="/invites", tags=["invites"])
    api_router.include_router(members.router, prefix="/members", tags=["members"])
    api_router.include_router(activity.router, prefix="/activity", tags=["activity"])
    api_router.include_router(posts.router, prefix="/posts", tags=["posts"])
    api_router.include_router(campaigns.router, prefix="/campaigns", tags=["campaigns"])
    api_router.include_router(library.router, prefix="/library", tags=["library"])
    api_router.include_router(scheduler.router, prefix="/scheduler", tags=["scheduler"])
    api_router.include_router(analytics.router, prefix="/analytics", tags=["analytics"])
    api_router.include_router(platforms.router, prefix="/platforms", tags=["platforms"])
    api_router.include_router(media.router, prefix="/media", tags=["media"])
    api_router.include_router(threads.router, prefix="/threads", tags=["threads"])
    api_router.include_router(ai.router, prefix="/ai", tags=["ai"])

# Setup routes when this module is imported by main.py
_setup_routes()
