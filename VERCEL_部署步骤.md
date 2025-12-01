# 🚀 CapWords - Vercel 网页部署完整指南

## 📦 准备工作（5分钟）

### 第一步：打包项目文件

你的项目文件已经准备好了，位于：
```
/Users/sofiali/CodeBuddy/20251020190956/vercel-deploy/
```

这个目录包含：
- ✅ `api/` - API 函数（已优化，移除了 node-fetch）
- ✅ `public/` - 前端页面
- ✅ `vercel.json` - Vercel 配置
- ✅ `package.json` - 依赖配置

---

## 🌐 Vercel 网页部署步骤

### 第二步：上传到 GitHub（2 种方法任选其一）

#### 方法 A：使用 GitHub Desktop（最简单）

1. **下载 GitHub Desktop**
   - 访问：https://desktop.github.com/
   - 下载并安装

2. **创建仓库**
   - 打开 GitHub Desktop
   - File > Add Local Repository
   - 选择文件夹：`/Users/sofiali/CodeBuddy/20251020190956/vercel-deploy`
   - 点击 "Create Repository" 

3. **发布到 GitHub**
   - 点击 "Publish repository"
   - 仓库名称：`capwords`
   - 取消勾选 "Keep this code private"（或保持勾选如果想私有）
   - 点击 "Publish Repository"

#### 方法 B：使用命令行（如果你熟悉 Git）

```bash
cd /Users/sofiali/CodeBuddy/20251020190956/vercel-deploy

# 初始化 Git
git init

# 添加文件
git add .

# 提交
git commit -m "Initial commit: CapWords app ready for deployment"

# 在 GitHub 创建仓库后，关联并推送
# 1. 访问 https://github.com/new
# 2. 创建名为 capwords 的仓库
# 3. 复制仓库 URL，然后运行：

git remote add origin https://github.com/你的用户名/capwords.git
git branch -M main
git push -u origin main
```

---

### 第三步：在 Vercel 部署

1. **访问 Vercel**
   - 打开浏览器，访问：https://vercel.com
   - 点击右上角 **"Sign Up"** 或 **"Login"**

2. **使用 GitHub 登录**
   - 选择 **"Continue with GitHub"**
   - 授权 Vercel 访问你的 GitHub 账号

3. **导入项目**
   - 在 Vercel Dashboard 点击 **"Add New..."**
   - 选择 **"Project"**
   - 在列表中找到 **`capwords`** 仓库
   - 点击 **"Import"**

4. **配置项目**（重要！）
   - Project Name: `capwords` （或自定义）
   - Framework Preset: 保持默认或选择 "Other"
   - Root Directory: `./` （保持默认）
   
5. **配置环境变量**（必须！）
   
   展开 **"Environment Variables"** 部分，依次添加以下 4 个变量：

   | Name | Value |
   |------|-------|
   | `SECRET_ID` | 从 `环境变量配置.txt` 文件中复制 |
   | `SECRET_KEY` | 从 `环境变量配置.txt` 文件中复制 |
   | `BOT_APP_KEY` | 从 `环境变量配置.txt` 文件中复制 |
   | `BOT_BIZ_ID` | 从 `环境变量配置.txt` 文件中复制 |
   
   **⚠️ 重要：** 具体的值请查看本地的 `环境变量配置.txt` 文件，不要直接写在 GitHub 上

   **添加方式：**
   - 在 "Name" 输入框输入变量名
   - 在 "Value" 输入框粘贴对应的值
   - 点击 "Add" 按钮
   - 重复以上步骤添加所有 4 个变量

6. **开始部署**
   - 确认所有环境变量都已添加
   - 点击蓝色的 **"Deploy"** 按钮

7. **等待部署完成**
   - Vercel 会显示实时构建日志
   - 通常需要 1-3 分钟
   - 看到 "🎉 Congratulations!" 表示部署成功

---

## ✅ 部署后测试

### 第四步：访问你的应用

1. **获取 URL**
   - 部署成功后，Vercel 会显示你的应用 URL
   - 通常格式为：`https://capwords.vercel.app`
   - 或类似：`https://capwords-用户名.vercel.app`

2. **测试功能**
   - 点击 URL 访问你的应用
   - 测试照相机/上传图片功能
   - 测试 AI 识别功能
   - 查看生成的单词卡片

3. **检查控制台**
   - 按 F12 打开浏览器开发者工具
   - 查看 Console 标签，不应该有错误
   - 查看 Network 标签，API 请求应该成功（状态码 200）

---

## 🎯 常见问题

### Q1: 部署失败怎么办？

**解决方法：**
1. 点击 Vercel 中的 "Deployments" 标签
2. 找到失败的部署，点击查看详细日志
3. 检查错误信息：
   - 如果是 "Missing environment variables"：重新添加环境变量
   - 如果是 "Build failed"：检查 package.json 是否正确
   - 如果是 "Function timeout"：联系我优化代码

### Q2: API 请求失败（500 错误）

**解决方法：**
1. 在 Vercel Dashboard 点击项目
2. 点击 "Settings" > "Environment Variables"
3. 确认所有 4 个变量都已添加且值正确
4. 重新部署：Deployments > 最新部署 > 右侧菜单 > "Redeploy"

### Q3: 页面打开了但功能不工作

**解决方法：**
1. 按 F12 打开浏览器控制台
2. 查看 Console 中的错误信息
3. 常见原因：
   - BOT_APP_KEY 未配置：页面会提示输入
   - 网络请求被阻止：检查浏览器是否阻止了请求
   - API 路径错误：联系我检查代码

### Q4: 想要自定义域名

**步骤：**
1. 在 Vercel 项目中点击 "Settings"
2. 点击 "Domains"
3. 输入你的域名（需要先购买域名）
4. 按照提示配置 DNS 记录

---

## 🔄 更新应用

以后如果需要更新代码：

### 方法 1：GitHub Desktop
1. 修改本地代码
2. 打开 GitHub Desktop
3. 在 Changes 中查看修改
4. 填写 Commit 信息
5. 点击 "Commit to main"
6. 点击 "Push origin"
7. Vercel 会自动检测更新并重新部署

### 方法 2：命令行
```bash
cd /Users/sofiali/CodeBuddy/20251020190956/vercel-deploy
git add .
git commit -m "更新说明"
git push
```

---

## 📊 部署清单

部署前请确认：

- [ ] GitHub 账号已准备好
- [ ] 代码已上传到 GitHub
- [ ] Vercel 账号已创建（用 GitHub 登录）
- [ ] 项目已导入到 Vercel
- [ ] 4 个环境变量全部添加
- [ ] 点击了 Deploy 按钮
- [ ] 部署成功（看到成功页面）
- [ ] 访问 URL 能正常打开
- [ ] 测试上传图片功能正常
- [ ] 测试 AI 识别功能正常

---

## 🎉 完成！

如果一切顺利，你的 CapWords 应用现在已经在线了！

**下一步可以做：**
- 📱 分享链接给朋友测试
- 🎨 自定义页面样式
- 🌐 绑定自定义域名
- 📊 查看 Vercel 分析数据

---

## 📞 需要帮助？

如果遇到问题：
1. 查看 Vercel 部署日志（Deployments > 点击部署 > 查看日志）
2. 检查浏览器控制台错误（F12 > Console）
3. 确认环境变量配置正确
4. 联系我获取支持

**祝你部署成功！🚀**
