from http.server import BaseHTTPRequestHandler
import json
import os
import requests
import sseclient

# 配置常量
SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse"
BOT_APP_KEY = os.getenv('BOT_APP_KEY')

class handler(BaseHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.end_headers()

    def do_POST(self):
        try:
            # 读取请求数据
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            data = json.loads(post_data.decode('utf-8'))
            
            # 构建请求头
            headers = {
                'Content-Type': 'application/json',
                'X-App-Key': BOT_APP_KEY
            }
            
            # 转发请求到腾讯云 SSE 接口
            response = requests.post(
                SSE_URL,
                json=data,
                headers=headers,
                stream=True,
                timeout=60
            )
            
            # 返回 SSE 响应
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Cache-Control', 'no-cache')
            self.send_header('X-Accel-Buffering', 'no')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            # 流式传输 SSE 事件
            client = sseclient.SSEClient(response)
            for event in client.events():
                if event.data:
                    self.wfile.write(f"data: {event.data}\n\n".encode())
                    self.wfile.flush()
            
        except Exception as e:
            self.send_response(500)
            self.send_header('Content-Type', 'text/event-stream')
            self.send_header('Access-Control-Allow-Origin', '*')
            self.end_headers()
            
            error_data = json.dumps({'error': str(e)})
            self.wfile.write(f"data: {error_data}\n\n".encode())
