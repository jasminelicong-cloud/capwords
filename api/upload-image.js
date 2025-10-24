const tencentcloud = require("tencentcloud-sdk-nodejs");
const COS = require('cos-nodejs-sdk-v5');
const formidable = require('formidable');
const fs = require('fs');

// 配置常量
const REGION = "ap-guangzhou";
const ENDPOINT = "lke.tencentcloudapi.com";
const TYPE_KEY_REALTIME = "realtime";

// 从环境变量读取配置
const SECRET_ID = process.env.SECRET_ID;
const SECRET_KEY = process.env.SECRET_KEY;
const BOT_BIZ_ID = process.env.BOT_BIZ_ID;

// 获取临时密钥
async function getTemporaryCredentials(botBizId, fileType, isPublic, typeKey) {
    const CommonClient = tencentcloud.common.CommonClient;
    const clientConfig = {
        credential: {
            secretId: SECRET_ID,
            secretKey: SECRET_KEY,
        },
        region: REGION,
        profile: {
            httpProfile: {
                endpoint: ENDPOINT,
            },
        },
    };

    const client = new CommonClient("lke", "2023-11-30", clientConfig);
    const params = {
        BotBizId: botBizId,
        FileType: fileType,
        TypeKey: typeKey,
        IsPublic: isPublic
    };

    const response = await client.call("DescribeStorageCredential", params);
    const credentials = response.Credentials;
    const uploadPath = response.UploadPath;
    const bucket = response.Bucket;
    const region = response.Region;
    const cosType = response.Type;

    return {
        TmpSecretId: credentials.TmpSecretId,
        TmpSecretKey: credentials.TmpSecretKey,
        Token: credentials.Token,
        UploadPath: uploadPath,
        Bucket: bucket,
        Region: region,
        Type: cosType
    };
}

// 上传文件到 COS
async function uploadFileToCOS(fileBuffer, fileName, credentials) {
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
                resolve({
                    url: cosUrl,
                    cosPath: credentials.UploadPath,
                    fileName: fileName
                });
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
        res.status(200).end();
        return;
    }

    if (req.method !== 'POST') {
        res.status(405).json({ error: 'Method not allowed' });
        return;
    }

    try {
        // 解析 multipart/form-data
        const form = formidable({ multiples: false });
        
        form.parse(req, async (err, fields, files) => {
            if (err) {
                res.status(500).json({ error: err.message });
                return;
            }

            const file = files.file;
            if (!file) {
                res.status(400).json({ error: '没有文件' });
                return;
            }

            // 读取文件
            const fileBuffer = fs.readFileSync(file.filepath);
            const fileName = file.originalFilename;
            const fileExt = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();

            // 获取临时密钥
            const credentials = await getTemporaryCredentials(
                BOT_BIZ_ID,
                fileExt,
                true,
                TYPE_KEY_REALTIME
            );

            // 上传到 COS
            const result = await uploadFileToCOS(fileBuffer, fileName, credentials);

            res.status(200).json({
                success: true,
                imageUrl: result.url,
                cosPath: result.cosPath
            });
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};
