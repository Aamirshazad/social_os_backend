#!/usr/bin/env python3
"""
Fix Analytics API file specifically
"""
import re

def fix_analytics_file():
    """Fix Analytics API file"""
    filepath = "app/api/v1/analytics.py"
    
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Fix function signatures - remove empty lines and fix parameter order
    content = re.sub(
        r'(\w+: [^=]+= [^,]+),\s*request: Request,\s*\n\s*\n\s*(db: AsyncSession = Depends\(get_async_db\))',
        r'request: Request,\n    \1,\n    \2',
        content,
        flags=re.MULTILINE
    )
    
    # Add auth verification at the start of each function
    def add_auth_to_function(match):
        func_start = match.group(0)
        return func_start + '\n    # Verify authentication and get user data\n    user_id, user_data = await verify_auth_and_get_user(request, db)\n    workspace_id = user_data["workspace_id"]\n    '
    
    # Add auth verification after docstrings
    content = re.sub(
        r'(async def \w+\([^)]*\):\s*"""\s*[^"]*"""\s*)',
        add_auth_to_function,
        content,
        flags=re.DOTALL
    )
    
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("✅ Fixed Analytics API file")

if __name__ == "__main__":
    fix_analytics_file()
