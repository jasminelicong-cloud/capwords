/**
 * SSE Chat API - Serverless Function
 * Uses Node 18+ native fetch API
 */

const SSE_URL = "https://wss.lke.cloud.tencent.com/v1/qbot/chat/sse";

async function forwardSSE(req, res) {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        const { image_url, query, bot_app_key } = req.body;

        const appKey = bot_app_key || process.env.BOT_APP_KEY;

        if (!appKey) {
            return res.status(400).json({
                error: 'Missing bot_app_key',
                hint: 'Provide bot_app_key in request body'
            });
        }

        const sessionId = 'sess_' + Date.now();

        // Build request content
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

        console.log('[chat-sse-v2] Sending to Tencent Cloud:', {
            url: SSE_URL,
            content_length: content.length,
            has_image: !!image_url
        });

        // Call Tencent Cloud API
        const response = await fetch(SSE_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestBody)
        });

        console.log('[chat-sse-v2] Response status:', response.status);

        if (!response.ok) {
            const errorText = await response.text();
            console.error('[chat-sse-v2] Error:', response.status, errorText.substring(0, 200));
            return res.status(response.status).json({
                error: `API error: ${response.status}`,
                details: errorText.substring(0, 200)
            });
        }

        // Set SSE response headers
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');

        // Stream response
        const reader = response.body.getReader();
        const encoder = new TextEncoder();

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                res.write(value);
            }
        } finally {
            reader.cancel();
        }

        res.end();

    } catch (error) {
        console.error('[chat-sse-v2] Exception:', error.message, error.stack);
        if (!res.headersSent) {
            res.status(500).json({
                error: error.message
            });
        }
    }
}

module.exports = forwardSSE;
