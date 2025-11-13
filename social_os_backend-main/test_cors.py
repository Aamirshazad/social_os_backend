#!/usr/bin/env python3
"""
Simple CORS test script to verify the backend configuration
"""
import requests
import json

def test_cors(base_url="http://localhost:8000"):
    """Test CORS configuration"""
    print(f"Testing CORS configuration for: {base_url}")
    print("=" * 50)
    
    # Test 1: Simple GET request
    try:
        response = requests.get(f"{base_url}/cors-test")
        print(f"✓ GET /cors-test: {response.status_code}")
        print(f"  Response: {response.json()}")
        print(f"  CORS Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"✗ GET /cors-test failed: {e}")
    
    print("-" * 30)
    
    # Test 2: OPTIONS request (preflight)
    try:
        headers = {
            'Origin': 'https://social-os-frontend.vercel.app',
            'Access-Control-Request-Method': 'POST',
            'Access-Control-Request-Headers': 'Content-Type'
        }
        response = requests.options(f"{base_url}/api/v1/auth/login", headers=headers)
        print(f"✓ OPTIONS /api/v1/auth/login: {response.status_code}")
        print(f"  CORS Headers: {dict(response.headers)}")
    except Exception as e:
        print(f"✗ OPTIONS /api/v1/auth/login failed: {e}")
    
    print("-" * 30)
    
    # Test 3: Check config
    try:
        response = requests.get(f"{base_url}/config-check")
        print(f"✓ GET /config-check: {response.status_code}")
        config = response.json()
        print(f"  CORS Origins: {config.get('cors_origins', 'Not found')}")
        print(f"  Environment: {config.get('environment', 'Not found')}")
    except Exception as e:
        print(f"✗ GET /config-check failed: {e}")

if __name__ == "__main__":
    # Test local server
    print("Testing local server...")
    test_cors("http://localhost:8000")
    
    print("\n" + "=" * 50)
    
    # Test production server
    print("Testing production server...")
    test_cors("https://social-os-backend-5.onrender.com")
