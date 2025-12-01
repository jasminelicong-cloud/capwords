/**
 * Config API - 提供前端配置
 */

module.exports = async (req, res) => {
    // CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'GET') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        // 返回 BOT_APP_KEY（如果环境变量中有的话）
        const botAppKey = process.env.BOT_APP_KEY;
        
        res.status(200).json({
            bot_app_key: botAppKey || '',
            has_key: !!botAppKey
        });
    } catch (error) {
        console.error('[config] Error:', error);
        res.status(500).json({ error: error.message });
    }
};
