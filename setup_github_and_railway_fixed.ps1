# Corrected GitHub & Railway Setup Script

param(
    [Parameter(Mandatory=$true)]
    [string]$GitHubUsername,

    [Parameter(Mandatory=$true)]
    [string]$RepoName
)

Write-Host "🚀 Setting up GitHub repository and Railway deployment..." -ForegroundColor Green

# Step 1: Set up GitHub remote
$remoteUrl = "https://github.com/$GitHubUsername/$RepoName.git"
Write-Host "Adding GitHub remote: $remoteUrl" -ForegroundColor Yellow
git remote add origin $remoteUrl

# Step 2: Push to GitHub (will fail if repo doesn't exist - that's expected)
Write-Host "Attempting to push code to GitHub..." -ForegroundColor Yellow
Write-Host "Note: This will fail if the GitHub repo doesn't exist yet." -ForegroundColor Red
try {
    git push -u origin master
    Write-Host "✅ Code pushed to GitHub successfully!" -ForegroundColor Green
} catch {
    Write-Host "❌ GitHub push failed - repository likely doesn't exist yet" -ForegroundColor Red
    Write-Host "Please create the repository at: https://github.com/$GitHubUsername/$RepoName" -ForegroundColor Yellow
    Write-Host "Then run: git push -u origin master" -ForegroundColor Yellow
    exit 1
}

# Step 3: Create Railway project
Write-Host "Creating Railway project..." -ForegroundColor Yellow
railway init

# Step 4: Set environment variables from .env file
Write-Host "Setting environment variables..." -ForegroundColor Yellow
if (Test-Path ".env") {
    Get-Content ".env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1].Trim()
            $value = $matches[2].Trim()
            if ($key -and $value -and $key -notmatch '^#') {
                Write-Host "Setting $key..." -ForegroundColor Gray
                railway variables --set "$key=$value"
            }
        }
    }
} else {
    Write-Warning ".env file not found. You'll need to set environment variables manually in Railway dashboard."
}

# Step 5: Deploy
Write-Host "Deploying to Railway..." -ForegroundColor Yellow
railway up

# Step 6: Get domain
Write-Host "Getting your Railway domain..." -ForegroundColor Yellow
railway domain

Write-Host "✅ Deployment complete!" -ForegroundColor Green
Write-Host "Update your Slack app webhooks with the Railway domain shown above." -ForegroundColor Green
Write-Host "Example: https://your-app.up.railway.app/slack/commands" -ForegroundColor Green
