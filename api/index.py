"""
Basic test for Vercel Python runtime
"""
import json

def handler(request):
    return {
        'statusCode': 200,
        'headers': {'Content-Type': 'application/json'},
        'body': json.dumps({
            'message': 'Hello from Vercel!',
            'status': 'working',
            'method': request.get('method', 'unknown'),
            'path': request.get('path', 'unknown')
        })
    }
