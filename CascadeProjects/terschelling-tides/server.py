from http.server import HTTPServer, SimpleHTTPRequestHandler
import json
import urllib.request
import urllib.error
import traceback

class ProxyHandler(SimpleHTTPRequestHandler):
    def do_POST(self):
        if self.path == '/api/tide':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                # Log the request data
                print("Request data:", post_data.decode('utf-8'))
                
                # Forward request to Rijkswaterstaat API
                req = urllib.request.Request(
                    'https://waterwebservices.rijkswaterstaat.nl/ONLINEWAARNEMINGENSERVICES_DBO/OphalenWaarnemingen',
                    data=post_data,
                    headers={
                        'Content-Type': 'application/json',
                        'Accept': 'application/json'
                    }
                )
                
                try:
                    with urllib.request.urlopen(req) as response:
                        response_data = response.read()
                        print("API Response:", response_data.decode('utf-8'))
                        
                        # Send response back to client
                        self.send_response(200)
                        self.send_header('Content-type', 'application/json')
                        self.send_header('Access-Control-Allow-Origin', '*')
                        self.end_headers()
                        self.wfile.write(response_data)
                        
                except urllib.error.HTTPError as e:
                    print(f"HTTP Error: {e.code} - {e.reason}")
                    print("Error response body:", e.read().decode('utf-8'))
                    raise
                    
            except Exception as e:
                print("Error details:", str(e))
                print("Traceback:", traceback.format_exc())
                self.send_response(500)
                self.send_header('Content-type', 'application/json')
                self.send_header('Access-Control-Allow-Origin', '*')
                self.end_headers()
                self.wfile.write(json.dumps({
                    'error': str(e),
                    'traceback': traceback.format_exc()
                }).encode())
        else:
            return SimpleHTTPRequestHandler.do_POST(self)
    
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

if __name__ == '__main__':
    server_address = ('', 8000)
    httpd = HTTPServer(server_address, ProxyHandler)
    print('Server running on port 8000...')
    httpd.serve_forever()
