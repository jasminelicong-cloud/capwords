# CapWords - Vercel 部署版本

## 部署步骤

### 1. 安装 Vercel CLI
```bash
npm install -g vercel
```

### 2. 登录 Vercel
```bash
vercel login
```

### 3. 部署项目
在 `vercel-deploy` 目录下运行：
```bash
cd vercel-deploy
vercel
```

按照提示操作：
- 选择 "Set up and deploy"
- 选择你的账户
- 项目名称：capwords（或自定义）
- 目录：当前目录（直接回车）
- 覆盖设置：No（直接回车）

### 4. 配置环境变量（重要！）

部署后，需要在 Vercel 控制台配置环境变量：

1. 访问 https://vercel.com/dashboard
2. 选择你的项目
3. 进入 Settings > Environment Variables
4. 添加以下环境变量（从你的 `.env` 文件或 `环境变量配置.txt` 文件中获取实际值）：
   - `SECRET_ID`: 你的腾讯云 Secret ID
   - `SECRET_KEY`: 你的腾讯云 Secret Key
   - `BOT_APP_KEY`: 你的 Bot App Key
   - `BOT_BIZ_ID`: 你的 Bot Biz ID

5. 重新部署：
```bash
vercel --prod
```

### 5. 访问应用

部署成功后，Vercel 会提供一个永久的 URL，例如：
```
https://capwords.vercel.app
```

## 注意事项

- ✅ Vercel 免费版永久可用
- ✅ 自动 HTTPS
- ✅ 全球 CDN 加速
- ⚠️ 环境变量包含敏感信息，请妥善保管
- ⚠️ Serverless 函数有执行时间限制（免费版 10 秒）

## 故障排除

如果部署失败，检查：
1. 是否正确配置了所有环境变量
2. requirements.txt 中的依赖是否正确
3. 查看 Vercel 控制台的部署日志
