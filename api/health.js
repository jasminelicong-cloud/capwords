/**
 * 健康检查接口 - 诊断环境变量是否正确配置
 */

module.exports = async (req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    if (req.method !== 'GET') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        const BOT_APP_KEY = process.env.BOT_APP_KEY;
        const SECRET_ID = process.env.SECRET_ID;
        const SECRET_KEY = process.env.SECRET_KEY;
        const BOT_BIZ_ID = process.env.BOT_BIZ_ID;

        const status = {
            timestamp: new Date().toISOString(),
            environment: {
                BOT_APP_KEY: BOT_APP_KEY ? `已配置 (${BOT_APP_KEY.substring(0, 20)}...)` : '❌ 未配置',
                SECRET_ID: SECRET_ID ? `已配置 (${SECRET_ID.substring(0, 20)}...)` : '❌ 未配置',
                SECRET_KEY: SECRET_KEY ? `已配置 (${SECRET_KEY.substring(0, 20)}...)` : '❌ 未配置',
                BOT_BIZ_ID: BOT_BIZ_ID ? `已配置 (${BOT_BIZ_ID})` : '❌ 未配置'
            },
            allConfigured: !!(BOT_APP_KEY && SECRET_ID && SECRET_KEY && BOT_BIZ_ID),
            apiEndpoints: {
                chatSSE: '/api/chat-sse',
                uploadImage: '/api/upload-image',
                health: '/api/health'
            }
        };

        res.status(200).json(status);
    } catch (error) {
        console.error('❌ 错误:', error.message);
        res.status(500).json({
            error: error.message,
            type: error.constructor.name
        });
    }
};
