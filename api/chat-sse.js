const fetch = require('node-fetch');

// 配置常量
const SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";
const BOT_APP_KEY = process.env.BOT_APP_KEY;

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

    try {
        // 转发请求到腾讯云 SSE 接口
        const response = await fetch(SSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-App-Key': BOT_APP_KEY
            },
            body: JSON.stringify(req.body)
        });

        // 设置 SSE 响应头
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // 流式传输响应
        response.body.pipe(res);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
