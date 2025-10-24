# GitHub & Railway Setup Script
# Run this AFTER creating your GitHub repository

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,

    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

Write-Host "🚀 Setting up GitHub repository and Railway deployment..." -ForegroundColor Green

# Set up GitHub remote
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
Write-Host "Adding GitHub remote: $remoteUrl" -ForegroundColor Yellow
git remote add origin $remoteUrl

# Push to GitHub
Write-Host "Pushing code to GitHub..." -ForegroundColor Yellow
git push -u origin master

# Check if Railway CLI is installed
if (!(Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "Installing Railway CLI..." -ForegroundColor Yellow
    npm install -g @railway/cli
}

# Login to Railway
Write-Host "Logging into Railway..." -ForegroundColor Yellow
railway login

# Create new project
Write-Host "Creating Railway project..." -ForegroundColor Yellow
railway init $RepoName

# Set environment variables from .env file
Write-Host "Setting environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($key -and $value -and $key -notmatch '^#') {
                Write-Host "Setting $key..." -ForegroundColor Gray
                railway variables set $key $value
            }
        }
    }
} else {
    Write-Warning ".env file not found. You'll need to set environment variables manually in Railway dashboard."
}

# Deploy
Write-Host "Deploying to Railway..." -ForegroundColor Yellow
railway up

# Get domain
Write-Host "Getting your Railway domain..." -ForegroundColor Yellow
railway domain

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Update your Slack app webhooks with the Railway domain shown above." -ForegroundColor Green
Write-Host "Example: https://your-app.up.railway.app/slack/commands" -ForegroundColor Green
