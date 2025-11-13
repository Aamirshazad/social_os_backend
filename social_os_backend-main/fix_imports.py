#!/usr/bin/env python3
"""
Quick script to fix import issues in API files
"""
import os
import re

# Files to fix
api_files = [
    "app/api/v1/campaigns.py",
    "app/api/v1/analytics.py", 
    "app/api/v1/library.py",
    "app/api/v1/media.py",
    "app/api/v1/scheduler.py",
    "app/api/v1/platforms.py",
    "app/api/v1/oauth.py",
    "app/api/v1/invites.py",
    "app/api/v1/activity.py",
    "app/api/v1/threads.py",
    "app/api/v1/members.py"
]

def fix_file(filepath):
    """Fix imports and function signatures in a file"""
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Skip if already using new auth helper
    if 'from app.core.auth_helper import' in content:
        print(f"Already fixed: {filepath}")
        return
    
    # Add Request import if missing
    if 'from fastapi import' in content and 'Request' not in content:
        content = re.sub(
            r'from fastapi import ([^)]+)',
            r'from fastapi import \1, Request',
            content
        )
    
    # Add AsyncSession import if missing  
    if 'AsyncSession' not in content:
        content = re.sub(
            r'from fastapi import ([^)]+)',
            r'from fastapi import \1\nfrom sqlalchemy.ext.asyncio import AsyncSession',
            content
        )
    
    # Replace old auth imports
    content = re.sub(
        r'from app\.dependencies import.*',
        'from app.core.auth_helper import verify_auth_and_get_user, require_admin_role',
        content
    )
    
    # Replace old middleware imports
    content = re.sub(
        r'from app\.core\.middleware import.*',
        'from app.core.auth_helper import verify_auth_and_get_user, require_admin_role',
        content
    )
    
    # Add database import if missing
    if 'get_async_db' not in content:
        content = re.sub(
            r'from app\.core\.auth_helper import.*',
            r'\g<0>\nfrom app.database import get_async_db',
            content
        )
    
    print(f"Fixed imports in: {filepath}")
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)

def main():
    """Fix all API files"""
    for filepath in api_files:
        fix_file(filepath)
    print("Done fixing imports!")

if __name__ == "__main__":
    main()
