#!/bin/bash

echo "🚀 开始全面功能验证..."
echo "================================"

# 检查 Node.js 和 npm
echo "📦 检查运行环境..."
node --version
npm --version
echo ""

# 安装依赖（如果需要）
if [ ! -d "node_modules" ]; then
    echo "📦 安装依赖..."
    npm install
fi

# 检查环境文件
echo "📁 检查环境文件..."
if [ -f ".env" ]; then
    echo "✅ 根目录 .env 存在"
else
    echo "❌ 根目录 .env 不存在"
fi

if [ -f "cloud-functions/.env" ]; then
    echo "✅ cloud-functions/.env 存在"
else
    echo "❌ cloud-functions/.env 不存在"
fi
echo ""

# 运行安全检查
echo "🔒 运行安全检查..."
if [ -f "scripts/security-check.sh" ]; then
    ./scripts/security-check.sh
else
    echo "❌ 安全检查脚本不存在"
fi
echo ""

# 测试各个服务
echo "🔍 测试 Supabase 连接..."
node scripts/test-supabase.js
echo ""

echo "🔍 测试 LemonSqueezy API..."
node scripts/test-lemonsqueezy.js
echo ""

echo "🔍 测试 Vertex AI 配置..."
node scripts/test-vertex-ai.js
echo ""

echo "🔍 检查前端环境变量..."
node scripts/test-frontend-env.js
echo ""

# 尝试构建项目
echo "🏗️ 测试项目构建..."
echo "构建前端..."
npm run build 2>/dev/null && echo "✅ 前端构建成功" || echo "❌ 前端构建失败"

echo "构建云函数..."
cd cloud-functions
npm run build 2>/dev/null && echo "✅ 云函数构建成功" || echo "❌ 云函数构建失败"
cd ..

echo ""
echo "🎉 功能验证完成！"
echo "================================"