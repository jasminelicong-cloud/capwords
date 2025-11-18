const fetch = require('node-fetch');

// 配置常量
const SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";
const BOT_APP_KEY = process.env.BOT_APP_KEY;

console.log('🔧 chat-sse.js 已加载');
console.log('✓ BOT_APP_KEY 已配置:', BOT_APP_KEY ? `是 (${BOT_APP_KEY.substring(0, 30)}...)` : '否');
console.log('📋 环境变量检查:');
console.log('  - BOT_APP_KEY:', BOT_APP_KEY ? '✅' : '❌');
console.log('  - process.env:', Object.keys(process.env).length, '个变量');

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
        
        const { image_url, query } = req.body;
        
        // 生成 Session ID
        const sessionId = 'sess_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
        
        // 构建 Markdown 格式的内容
        // 格式: "query文本![](image_url)"
        let content = query || '请识别这张图片';
        if (image_url) {
            content = content + `![](${image_url})`;
        }
        
        // 构建符合 ADP 要求的请求格式
        const requestBody = {
            content: content,
            bot_app_key: BOT_APP_KEY,
            visitor_biz_id: sessionId,
            session_id: sessionId,
            request_id: sessionId,
            visitor_labels: []
        };
        
        console.log('📤 发送到腾讯云的请求:', JSON.stringify(requestBody, null, 2));
        
        // 转发请求到腾讯云 SSE 接口
        // 注意：不使用 X-App-Key 头，而是在 request body 中传递 bot_app_key
        const response = await fetch(SSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 30000
        });

        console.log('📥 收到响应:', response.status);
        console.log('📋 响应 Headers:', Object.fromEntries(response.headers));

        if (!response.ok) {
            const errorText = await response.text();
            console.error('❌ 腾讯云返回错误:', response.status);
            console.error('❌ 错误内容:', errorText);
            console.error('❌ 请求体回顾:', JSON.stringify(requestBody, null, 2));
            return res.status(response.status).json({ 
                error: `腾讯云 API 错误: ${response.status}`,
                details: errorText.substring(0, 300),
                requestBody: requestBody
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
