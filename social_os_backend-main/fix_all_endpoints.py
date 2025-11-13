#!/usr/bin/env python3
"""
Comprehensive script to fix all API endpoint function signatures
"""
import os
import re

def fix_function_signatures(filepath):
    """Fix function signatures in API files"""
    if not os.path.exists(filepath):
        return False
        
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    original_content = content
    
    # Add Request import if missing
    if 'Request' not in content and 'from fastapi import' in content:
        content = re.sub(
            r'(from fastapi import [^)]+)(?!\s*Request)',
            r'\1, Request',
            content
        )
    
    # Pattern to match old function signatures
    old_pattern = r'(\s+)(workspace_id: str = Depends\(get_workspace_id\),?\s*)(current_user: dict = Depends\(get_current_active_user\),?\s*)'
    
    # Replace with new pattern
    def replace_signature(match):
        indent = match.group(1)
        return f'{indent}request: Request,\n{indent}'
    
    content = re.sub(old_pattern, replace_signature, content, flags=re.MULTILINE)
    
    # Add auth verification at the start of function bodies
    # Look for function definitions and add auth verification
    function_pattern = r'(async def \w+\([^)]*\):\s*"""[^"]*"""\s*)'
    
    def add_auth_verification(match):
        func_def = match.group(1)
        return func_def + '\n    # Verify authentication and get user data\n    user_id, user_data = await verify_auth_and_get_user(request, db)\n    workspace_id = user_data["workspace_id"]\n    '
    
    # Only add if not already present
    if 'verify_auth_and_get_user' not in content:
        content = re.sub(function_pattern, add_auth_verification, content, flags=re.DOTALL)
    
    # Replace references to current_user["id"] with user_id
    content = re.sub(r'current_user\["id"\]', 'user_id', content)
    
    if content != original_content:
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        return True
    return False

def main():
    """Fix all API files"""
    api_files = [
        "app/api/v1/platforms.py",
        "app/api/v1/oauth.py", 
        "app/api/v1/scheduler.py",
        "app/api/v1/threads.py",
        "app/api/v1/invites.py",
        "app/api/v1/activity.py",
        "app/api/v1/campaigns.py",
        "app/api/v1/analytics.py",
        "app/api/v1/media.py"
    ]
    
    fixed_count = 0
    for filepath in api_files:
        if fix_function_signatures(filepath):
            print(f"✅ Fixed: {filepath}")
            fixed_count += 1
        else:
            print(f"⏭️  Skipped: {filepath}")
    
    print(f"\n🎉 Fixed {fixed_count} files!")

if __name__ == "__main__":
    main()
