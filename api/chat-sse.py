from flask import Flask, request, Response, stream_with_context
from flask_cors import CORS
import os
import json
import requests
import sseclient

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": "*"}})

# 配置常量
SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse"
BOT_APP_KEY = os.getenv('BOT_APP_KEY')

@app.route('/api/chat/sse', methods=['POST', 'OPTIONS'])
def chat_sse():
    """SSE 聊天代理"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        data = request.get_json()
        
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
        
        def generate():
            """生成 SSE 事件流"""
            client = sseclient.SSEClient(response)
            for event in client.events():
                if event.data:
                    yield f"data: {event.data}\n\n"
        
        return Response(
            stream_with_context(generate()),
            mimetype='text/event-stream',
            headers={
                'Cache-Control': 'no-cache',
                'X-Accel-Buffering': 'no',
                'Access-Control-Allow-Origin': '*'
            }
        )
        
    except Exception as e:
        return Response(
            f"data: {json.dumps({'error': str(e)})}\n\n",
            mimetype='text/event-stream'
        )

# Vercel 需要这个
def handler(request):
    with app.request_context(request.environ):
        return app.full_dispatch_request()
