/**
 * 改进的图片上传 API - 带诊断信息
 */

const tencentcloud = require("tencentcloud-sdk-nodejs-lke");
const COS = require('cos-nodejs-sdk-v5');
const multiparty = require('multiparty');
const fs = require('fs');

const REGION = "ap-guangzhou";
const TYPE_KEY_REALTIME = "realtime";

// 从环境变量读取配置
const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const BOT_BIZ_ID = process.env.BOT_BIZ_ID;

async function getTemporaryCredentials(botBizId, fileType, isPublic, typeKey) {
    if (!SECRET_ID || !SECRET_KEY) {
        const error = new Error('Missing SECRET_ID or SECRET_KEY');
        error.status = 400;
        throw error;
    }

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

module.exports = async (req, res) => {
    // CORS
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
        // 诊断环境变量
        const hasEnv = !!(SECRET_ID && SECRET_KEY && BOT_BIZ_ID);
        console.log('[upload-image-v2] 环境变量状态:', {
            SECRET_ID: SECRET_ID ? 'configured' : 'MISSING',
            SECRET_KEY: SECRET_KEY ? 'configured' : 'MISSING',
            BOT_BIZ_ID: BOT_BIZ_ID ? 'configured' : 'MISSING'
        });

        if (!hasEnv) {
            return res.status(400).json({
                error: 'Configuration missing',
                details: 'Please configure SECRET_ID, SECRET_KEY, BOT_BIZ_ID in Vercel environment',
                provided: {
                    SECRET_ID: !!SECRET_ID,
                    SECRET_KEY: !!SECRET_KEY,
                    BOT_BIZ_ID: !!BOT_BIZ_ID
                }
            });
        }

        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('[upload-image-v2] Parse error:', err);
                return res.status(500).json({ error: err.message });
            }

            const fileArray = files.file;
            if (!fileArray || fileArray.length === 0) {
                return res.status(400).json({ error: 'No file provided' });
            }

            const file = fileArray[0];
            const fileBuffer = fs.readFileSync(file.path);
            const fileName = file.originalFilename;
            
            let fileExt = fileName.substring(fileName.lastIndexOf('.') + 1).toLowerCase();
            const supportedFormats = ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'];
            if (!supportedFormats.includes(fileExt)) {
                fileExt = 'jpg';
            }
            
            console.log('[upload-image-v2] 文件:', {
                name: fileName,
                ext: fileExt,
                size: `${(fileBuffer.length / 1024 / 1024).toFixed(2)}MB`
            });

            try {
                const credentials = await getTemporaryCredentials(
                    BOT_BIZ_ID,
                    fileExt,
                    true,
                    TYPE_KEY_REALTIME
                );

                const result = await uploadFileToCOS(fileBuffer, credentials);
                fs.unlinkSync(file.path);

                console.log('[upload-image-v2] 上传成功:', result.url);
                return res.status(200).json({
                    success: true,
                    url: result.url
                });
            } catch (uploadError) {
                console.error('[upload-image-v2] 上传错误:', uploadError);
                return res.status(500).json({
                    error: uploadError.message,
                    type: uploadError.constructor.name
                });
            }
        });
    } catch (error) {
        console.error('[upload-image-v2] 处理器错误:', error);
        return res.status(500).json({
            error: error.message,
            type: error.constructor.name
        });
    }
};
