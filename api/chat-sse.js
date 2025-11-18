const fetch = require('node-fetch');

// 配置常量
const SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";
const BOT_APP_KEY = process.env.BOT_APP_KEY;

console.log('🔧 chat-sse.js 已加载');
console.log('✓ BOT_APP_KEY 已配置:', BOT_APP_KEY ? '是' : '否');

module.exports = async (req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    // 验证环境变量
    if (!BOT_APP_KEY) {
        console.error('❌ BOT_APP_KEY 未配置');
        return res.status(500).json({ 
            error: 'BOT_APP_KEY 环境变量未配置',
            hint: '请在 Vercel Settings → Environment Variables 中配置 BOT_APP_KEY'
        });
    }

    try {
        console.log('📤 正在调用腾讯云 SSE 接口...');
        console.log('📋 前端请求体:', JSON.stringify(req.body));
        
        // 构建腾讯云 API 请求格式
        // 格式: { "bot_id": "xxx", "conversation_id": "xxx", "messages": [...] }
        const { image_url, query } = req.body;
        
        // 生成 conversation ID
        const conversationId = 'conv_' + Date.now();
        
        // 构建消息内容：Markdown 格式
        // 重要：query 应该是 "请识别这张图片![](url)" 的格式
        let messageContent = query || '请识别这张图片';
        if (image_url && !messageContent.includes('![](')) {
            messageContent = messageContent + `![](${image_url})`;
        }
        
        const requestBody = {
            conversation_id: conversationId,
            messages: [
                {
                    role: 'user',
                    content: messageContent
                }
            ]
        };
        
        console.log('📤 发送到腾讯云的请求:', JSON.stringify(requestBody, null, 2));
        
        // 转发请求到腾讯云 SSE 接口
        const response = await fetch(SSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Key': BOT_APP_KEY
            },
            body: JSON.stringify(requestBody),
            timeout: 30000
        });

        console.log('📥 收到响应:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 腾讯云返回错误:', response.status, errorText);
            return res.status(response.status).json({ 
                error: `腾讯云 API 错误: ${response.status}`,
                details: errorText.substring(0, 200)
            });
        }

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 流式传输响应
        response.body.pipe(res);
        
    } catch (error) {
        console.error('❌ 错误:', error.message);
        res.status(500).json({ 
            error: error.message,
            type: error.constructor.name
        });
    }
};
