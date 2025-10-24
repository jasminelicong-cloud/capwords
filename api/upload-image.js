const tencentcloud = require("tencentcloud-sdk-nodejs-lke");
const COS = require('cos-nodejs-sdk-v5');

// 配置常量
const REGION = "ap-guangzhou";
const TYPE_KEY_REALTIME = "realtime";

// 从环境变量读取配置
const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const BOT_BIZ_ID = process.env.BOT_BIZ_ID;

// 获取临时密钥
async function getTemporaryCredentials(botBizId, fileType, isPublic, typeKey) {
    const client = new tencentcloud.lke.v20231130.Client({
        credential: {
            secretId: SECRET_ID,
            secretKey: SECRET_KEY,
        },
        region: REGION,
    });

    const params = {
        BotBizId: botBizId,
        FileType: fileType,
        TypeKey: typeKey,
        IsPublic: isPublic
    };

    const response = await client.DescribeStorageCredential(params);
    const credentials = response.Credentials;

    return {
        TmpSecretId: credentials.TmpSecretId,
        TmpSecretKey: credentials.TmpSecretKey,
        Token: credentials.Token,
        UploadPath: response.UploadPath,
        Bucket: response.Bucket,
        Region: response.Region,
        Type: response.Type
    };
}

// 上传文件到 COS
async function uploadFileToCOS(fileBuffer, credentials) {
    const cos = new COS({
        SecretId: credentials.TmpSecretId,
        SecretKey: credentials.TmpSecretKey,
        SecurityToken: credentials.Token,
    });

    return new Promise((resolve, reject) => {
        cos.putObject({
            Bucket: credentials.Bucket,
            Region: credentials.Region,
            Key: credentials.UploadPath,
            Body: fileBuffer,
        }, (err, data) => {
            if (err) {
                reject(err);
            } else {
                const bucketUrl = `https://${credentials.Bucket}.${credentials.Type}.${credentials.Region}.myqcloud.com`;
                const cosUrl = `${bucketUrl}${credentials.UploadPath}`;
                resolve({ url: cosUrl });
            }
        });
    });
}

// 解析 multipart/form-data（简化版）
async function parseMultipartForm(req) {
    return new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', chunk => chunks.push(chunk));
        req.on('end', () => {
            try {
                const buffer = Buffer.concat(chunks);
                const boundary = req.headers['content-type'].split('boundary=')[1];
                
                // 简单解析：找到文件数据部分
                const boundaryBuffer = Buffer.from(`--${boundary}`);
                const parts = [];
                let start = 0;
                
                while (true) {
                    const index = buffer.indexOf(boundaryBuffer, start);
                    if (index === -1) break;
                    if (start > 0) {
                        parts.push(buffer.slice(start, index));
                    }
                    start = index + boundaryBuffer.length;
                }
                
                // 找到文件部分
                for (const part of parts) {
                    const headerEnd = part.indexOf('\r\n\r\n');
                    if (headerEnd === -1) continue;
                    
                    const headers = part.slice(0, headerEnd).toString();
                    if (headers.includes('filename=')) {
                        const fileData = part.slice(headerEnd + 4, part.length - 2);
                        
                        // 提取文件名
                        const filenameMatch = headers.match(/filename="([^"]+)"/);
                        const filename = filenameMatch ? filenameMatch[1] : 'image.jpg';
                        
                        resolve({ buffer: fileData, filename });
                        return;
                    }
                }
                
                reject(new Error('No file found in request'));
            } catch (error) {
                reject(error);
            }
        });
        req.on('error', reject);
    });
}

module.exports = async (req, res) => {
    // 处理 CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('📥 收到上传请求');
        console.log('Content-Type:', req.headers['content-type']);
        
        // 检查环境变量
        if (!SECRET_ID || !SECRET_KEY || !BOT_BIZ_ID) {
            console.error('❌ 环境变量未配置');
            return res.status(500).json({ error: '服务器配置错误：缺少环境变量' });
        }
        
        // 解析文件
        const { buffer: fileBuffer, filename } = await parseMultipartForm(req);
        console.log('📁 文件名:', filename, '大小:', fileBuffer.length, 'bytes');
        
        const fileExt = filename.substring(filename.lastIndexOf('.')).toLowerCase();
        
        // 获取临时密钥
        console.log('🔑 获取临时密钥...');
        const credentials = await getTemporaryCredentials(
            BOT_BIZ_ID,
            fileExt,
            true,
            TYPE_KEY_REALTIME
        );
        
        // 上传到 COS
        console.log('☁️ 上传到 COS...');
        const result = await uploadFileToCOS(fileBuffer, credentials);
        
        console.log('✅ 上传成功:', result.url);
        return res.status(200).json({
            success: true,
            url: result.url
        });
        
    } catch (error) {
        console.error('❌ 上传错误:', error);
        return res.status(500).json({ 
            error: error.message,
            details: error.stack
        });
    }
};
