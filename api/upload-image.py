from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import json
import uuid
import base64
from pathlib import Path
from qcloud_cos import CosConfig, CosS3Client
from tencentcloud.common import credential
from tencentcloud.common.common_client import CommonClient
from tencentcloud.common.profile.client_profile import ClientProfile
from tencentcloud.common.profile.http_profile import HttpProfile

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*", "methods": ["GET", "POST", "OPTIONS"], "allow_headers": "*"}})

# 配置常量
REGION = "ap-guangzhou"
ENDPOINT = "lke.tencentcloudapi.com"
TYPE_KEY_REALTIME = "realtime"

# 从环境变量读取配置
SECRET_ID = os.getenv('SECRET_ID')
SECRET_KEY = os.getenv('SECRET_KEY')
BOT_BIZ_ID = os.getenv('BOT_BIZ_ID', '')

def get_temporary_credentials(bot_biz_id: str, file_type: str, is_public: bool, type_key: str) -> dict:
    """获取腾讯云 COS 临时密钥"""
    try:
        cred = credential.Credential(SECRET_ID, SECRET_KEY)
        http_profile = HttpProfile()
        http_profile.endpoint = ENDPOINT
        client_profile = ClientProfile()
        client_profile.httpProfile = http_profile

        params = {
            "BotBizId": bot_biz_id,
            "FileType": file_type,
            "TypeKey": type_key,
            "IsPublic": is_public
        }
        
        common_client = CommonClient("lke", "2023-11-30", cred, REGION, profile=client_profile)
        response = common_client.call_json("DescribeStorageCredential", params)
        
        credentials = response['Response']['Credentials']
        upload_path = response['Response']['UploadPath']
        bucket = response['Response']['Bucket']
        region = response['Response']['Region']
        cos_type = response['Response']['Type']

        return {
            "TmpSecretId": credentials['TmpSecretId'],
            "TmpSecretKey": credentials['TmpSecretKey'],
            "Token": credentials['Token'],
            "UploadPath": upload_path,
            "Bucket": bucket,
            "Region": region,
            "Type": cos_type
        }
    except Exception as err:
        raise Exception(f"获取临时密钥失败: {err}")

def upload_file_to_cos(file_data: bytes, file_name: str, credentials: dict) -> dict:
    """将文件上传到腾讯云 COS"""
    config = CosConfig(
        Region=credentials['Region'],
        SecretId=credentials['TmpSecretId'],
        SecretKey=credentials['TmpSecretKey'],
        Token=credentials['Token'],
        Scheme='https'
    )
    client = CosS3Client(config)

    # 直接上传字节数据
    response = client.put_object(
        Bucket=credentials['Bucket'],
        Key=credentials['UploadPath'],
        Body=file_data,
        EnableMD5=False
    )

    bucket_url = f"https://{credentials['Bucket']}.{credentials['Type']}.{credentials['Region']}.myqcloud.com"
    cos_final_url = f"{bucket_url}{credentials['UploadPath']}"
    
    return {
        "url": cos_final_url,
        "cosPath": credentials['UploadPath'],
        "fileName": file_name
    }

@app.route('/api/upload-image', methods=['POST', 'OPTIONS'])
def upload_image():
    """处理图片上传"""
    if request.method == 'OPTIONS':
        return '', 200
        
    try:
        if 'file' not in request.files:
            return jsonify({'error': '没有文件'}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({'error': '文件名为空'}), 400
        
        # 读取文件数据
        file_data = file.read()
        file_ext = Path(file.filename).suffix.lower()
        
        # 获取临时密钥
        credentials = get_temporary_credentials(
            bot_biz_id=BOT_BIZ_ID,
            file_type=file_ext,
            is_public=True,
            type_key=TYPE_KEY_REALTIME
        )
        
        # 上传到 COS
        result = upload_file_to_cos(file_data, file.filename, credentials)
        
        return jsonify({
            'success': True,
            'imageUrl': result['url'],
            'cosPath': result['cosPath']
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# Vercel 需要这个
def handler(request):
    with app.request_context(request.environ):
        return app.full_dispatch_request()
