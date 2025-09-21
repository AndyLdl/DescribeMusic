#!/bin/bash

# Vertex AI 设置脚本
# 为云函数启用必要的API和权限

PROJECT_ID="describe-music"
REGION="us-central1"

echo "🚀 设置 Vertex AI for Cloud Functions..."

# 1. 启用必要的API
echo "📡 启用必要的Google Cloud APIs..."
gcloud services enable aiplatform.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudfunctions.googleapis.com --project=$PROJECT_ID
gcloud services enable cloudresourcemanager.googleapis.com --project=$PROJECT_ID

# 2. 获取云函数的服务账号
FUNCTION_SA=$(gcloud projects describe $PROJECT_ID --format="value(projectNumber)")@appspot.gserviceaccount.com

echo "🔑 云函数服务账号: $FUNCTION_SA"

# 3. 为服务账号添加Vertex AI权限
echo "🛡️ 添加Vertex AI权限..."
gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$FUNCTION_SA" \
    --role="roles/aiplatform.user"

gcloud projects add-iam-policy-binding $PROJECT_ID \
    --member="serviceAccount:$FUNCTION_SA" \
    --role="roles/ml.developer"

# 4. 设置Firebase Functions配置
echo "⚙️ 设置Firebase Functions配置..."
firebase functions:config:set \
    vertex_ai.project_id="$PROJECT_ID" \
    vertex_ai.location="$REGION" \
    vertex_ai.model="gemini-1.5-flash" \
    --project=$PROJECT_ID

# 5. 验证设置
echo "✅ 验证Vertex AI设置..."
gcloud ai models list --region=$REGION --project=$PROJECT_ID --filter="displayName:gemini*" --limit=5

echo "🎉 Vertex AI 设置完成！"
echo ""
echo "📋 下一步："
echo "1. 运行 'npm install' 安装新的依赖"
echo "2. 运行 'npm run build' 构建项目"
echo "3. 运行 'npm run deploy' 部署云函数"
echo ""
echo "💰 成本优势："
echo "- Vertex AI 通常比直接 Gemini API 便宜 20-30%"
echo "- 更好的配额管理和监控"
echo "- 企业级安全和合规性"