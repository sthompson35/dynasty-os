#!/bin/bash
# Railway Deployment Helper Script

echo "🚀 Slack AI Gateway - Railway Deployment Helper"
echo "=============================================="

# Check if Railway CLI is installed
if ! command -v railway &> /dev/null; then
    echo "Installing Railway CLI..."
    curl -fsSL https://railway.app/install.sh | sh
fi

# Login to Railway
echo "Logging into Railway..."
railway login

# Create new project
echo "Creating Railway project..."
railway init slack-ai-gateway

# Set environment variables (REPLACE WITH YOUR ACTUAL VALUES)
echo "Setting environment variables..."
railway variables set SLACK_SIGNING_SECRET="your-signing-secret-here"
railway variables set SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
railway variables set DATABASE_URL="mssql+pymssql://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai"
railway variables set REDIS_URL="redis://redis:6380"
railway variables set MINIO_ENDPOINT="minio:9000"
railway variables set MINIO_ACCESS_KEY="minioadmin"
railway variables set MINIO_SECRET_KEY="minioadmin"

# Deploy
echo "Deploying to Railway..."
railway up

# Get domain
echo "Getting your Railway domain..."
railway domain

echo "✅ Deployment complete!"
echo "Update your Slack app webhooks with the Railway domain above."
echo "Example: https://your-app.up.railway.app/slack/commands"