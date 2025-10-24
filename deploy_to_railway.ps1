# Railway Deployment Helper Script for Windows
# Run this in PowerShell as Administrator

Write-Host "🚀 Slack AI Gateway - Railway Deployment Helper" -ForegroundColor Green
Write-Host "==============================================" -ForegroundColor Green

# Check if Railway CLI is installed
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    try {
        # Install Railway CLI using npm (requires Node.js)
        npm install -g @railway/cli
    } catch {
        Write-Host "Please install Node.js first: https://nodejs.org/" -ForegroundColor Red
        exit 1
    }
}

# Login to Railway
Write-Host "Logging into Railway..." -ForegroundColor Yellow
railway login

# Create new project
Write-Host "Creating Railway project..." -ForegroundColor Yellow
railway init slack-ai-gateway

# Set environment variables (REPLACE WITH YOUR ACTUAL VALUES)
Write-Host "Setting environment variables..." -ForegroundColor Yellow
railway variables set SLACK_SIGNING_SECRET="your-signing-secret-here"
railway variables set SLACK_BOT_TOKEN="xoxb-your-bot-token-here"
railway variables set DATABASE_URL="mssql+pymssql://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai"
railway variables set REDIS_URL="redis://redis:6380"
railway variables set MINIO_ENDPOINT="minio:9000"
railway variables set MINIO_ACCESS_KEY="minioadmin"
railway variables set MINIO_SECRET_KEY="minioadmin"

# Deploy
Write-Host "Deploying to Railway..." -ForegroundColor Yellow
railway up

# Get domain
Write-Host "Getting your Railway domain..." -ForegroundColor Yellow
railway domain

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Update your Slack app webhooks with the Railway domain above." -ForegroundColor Green
Write-Host "Example: https://your-app.up.railway.app/slack/commands" -ForegroundColor Green
