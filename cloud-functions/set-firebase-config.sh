#!/bin/bash

# Firebase Functions 配置脚本
# 用于设置云函数的环境变量

echo "🔧 设置 Firebase Functions 配置..."

# Lemonsqueezy 配置
firebase functions:config:set \
  lemonsqueezy.api_key="你的API密钥" \
  lemonsqueezy.store_id="你的店铺ID" \
  lemonsqueezy.webhook_secret="你的Webhook密钥" \
  lemonsqueezy.basic_variant_id="你的Basic变体ID" \
  lemonsqueezy.pro_variant_id="你的Pro变体ID" \
  lemonsqueezy.premium_variant_id="你的Premium变体ID"

echo "✅ Firebase Functions 配置完成！"
echo "📋 查看当前配置："
firebase functions:config:get

echo ""
echo "🚀 现在可以部署云函数："
echo "npm run deploy"