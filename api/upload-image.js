const tencentcloud = require("tencentcloud-sdk-nodejs-lke");
const COS = require('cos-nodejs-sdk-v5');
const multiparty = require('multiparty');
const fs = require('fs');

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
        // 解析 multipart/form-data
        const form = new multiparty.Form();

        form.parse(req, async (err, fields, files) => {
            if (err) {
                console.error('Parse error:', err);
                return res.status(500).json({ error: err.message });
            }

            const fileArray = files.file;
            if (!fileArray || fileArray.length === 0) {
                return res.status(400).json({ error: '没有文件' });
            }

            const file = fileArray[0];
            const fileBuffer = fs.readFileSync(file.path);
            const fileName = file.originalFilename;
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

            try {
                // 获取临时密钥
                const credentials = await getTemporaryCredentials(
                    BOT_BIZ_ID,
                    fileExt,
                    true,
                    TYPE_KEY_REALTIME
                );

                // 上传到 COS
                const result = await uploadFileToCOS(fileBuffer, credentials);

                // 清理临时文件
                fs.unlinkSync(file.path);

                return res.status(200).json({
                    success: true,
                    url: result.url
                });
            } catch (uploadError) {
                console.error('Upload error:', uploadError);
                return res.status(500).json({ error: uploadError.message });
            }
        });
    } catch (error) {
        console.error('Handler error:', error);
        return res.status(500).json({ error: error.message });
    }
};
