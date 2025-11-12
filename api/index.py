"""
Vercel Python serverless function
"""
from http.server import BaseHTTPRequestHandler
import json

class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            'message': 'Hello from Vercel!',
            'status': 'working',
            'method': 'GET',
            'path': self.path
        }
        
        self.wfile.write(json.dumps(response).encode())
        return
    
    def do_POST(self):
        self.send_response(200)
        self.send_header('Content-type', 'application/json')
        self.end_headers()
        
        response = {
            'message': 'Hello from Vercel!',
            'status': 'working',
            'method': 'POST',
            'path': self.path
        }
        
        self.wfile.write(json.dumps(response).encode())
        return
