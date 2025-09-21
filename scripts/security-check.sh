#!/bin/bash

# 安全检查脚本 - 检测可能的密钥泄漏

echo "🔍 正在检查可能的密钥泄漏..."

# 检查常见的密钥模式
echo "检查 JWT tokens..."
grep -r "eyJ[A-Za-z0-9_-]*\." --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" . || echo "✅ 未发现 JWT tokens"

echo "检查 API keys..."
grep -r "AIza[A-Za-z0-9_-]*" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" . || echo "✅ 未发现 Google API keys"

echo "检查硬编码的 URLs..."
grep -r "https://.*\.supabase\.co" --exclude-dir=node_modules --exclude-dir=.git --exclude="*.md" . || echo "✅ 未发现硬编码的 Supabase URLs"

echo "检查可能的密钥文件..."
find . -name "*.env*" -not -name "*.example" -not -path "./node_modules/*" -not -path "./.git/*"

echo "🔍 安全检查完成"