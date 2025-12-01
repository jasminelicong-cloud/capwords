#!/bin/bash

# CapWords Vercel 部署脚本
# 使用方式: ./deploy.sh [--prod]

set -e

echo "🚀 CapWords Vercel 部署脚本"
echo "=============================="
echo ""

# 检查 Vercel CLI
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI 未安装"
    echo "📦 安装: npm install -g vercel"
    exit 1
fi

echo "✅ Vercel CLI 已安装"

# 检查 Node.js 版本
NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 版本过低 (需要 18+)"
    exit 1
fi

echo "✅ Node.js 版本: $(node --version)"

# 检查依赖
echo "📦 检查依赖..."
if grep -q "node-fetch" package.json; then
    echo "❌ package.json 中仍有 node-fetch 依赖"
    echo "   请运行: npm uninstall node-fetch"
    exit 1
fi

echo "✅ 依赖检查通过"

# 列出环境变量需求
echo ""
echo "📝 部署前，请确保 Vercel Dashboard 中配置以下环境变量："
echo "   - BOT_APP_KEY"
echo "   - SECRET_ID"
echo "   - SECRET_KEY"
echo "   - BOT_BIZ_ID"
echo ""

# 部署
if [ "$1" == "--prod" ]; then
    echo "🔥 生产环境部署..."
    vercel --prod
else
    echo "🧪 测试环境部署..."
    vercel
fi

echo ""
echo "✅ 部署完成！"
echo "   访问: https://capwords.vercel.app (或你的自定义域名)"
