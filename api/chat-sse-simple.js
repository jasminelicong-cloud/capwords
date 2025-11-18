/**
 * 简化版 SSE Chat API
 * 直接使用前端提供的 BOT_APP_KEY
 */

const fetch = require('node-fetch');

const SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";

module.exports = async (req, res) => {
    // CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image_url, query, bot_app_key } = req.body;

        // 使用前端提供的 bot_app_key，或者使用环境变量
        const appKey = bot_app_key || process.env.BOT_APP_KEY;

        if (!appKey) {
            return res.status(400).json({
                error: 'Missing bot_app_key',
                hint: 'Please provide bot_app_key in request body or set BOT_APP_KEY environment variable'
            });
        }

        const sessionId = 'sess_' + Date.now();

        // 构建请求
        let content = query || '请识别这张图片';
        if (image_url) {
            content = content + `![](${image_url})`;
        }

        const requestBody = {
            content: content,
            bot_app_key: appKey,
            visitor_biz_id: sessionId,
            session_id: sessionId,
            request_id: sessionId,
            visitor_labels: []
        };

        console.log('[chat-sse-simple] 发送请求到腾讯云:', {
            url: SSE_URL,
            content_length: content.length,
            has_image: !!image_url
        });

        // 调用腾讯云 API
        const response = await fetch(SSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody),
            timeout: 30000
        });

        console.log('[chat-sse-simple] 收到响应:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[chat-sse-simple] 错误:', response.status, errorText.substring(0, 200));
            return res.status(response.status).json({
                error: `API error: ${response.status}`,
                details: errorText.substring(0, 200)
            });
        }

        // 设置 SSE 响应
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 流式转发
        response.body.pipe(res);

    } catch (error) {
        console.error('[chat-sse-simple] Exception:', error.message);
        res.status(500).json({
            error: error.message
        });
    }
};
