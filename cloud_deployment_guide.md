# 🚀 Alternative: Deploy to Free Cloud Service

Since tunneling is having issues, here's how to deploy your Slack AI Gateway to a free cloud service:

## Option 1: Railway (Recommended - Easiest)

### 1. Create Railway Account

- Go to [railway.app](https://railway.app)
- Sign up with GitHub
- Free tier: 512MB RAM, 1GB disk

### 2. Deploy from GitHub

```bash
# Push your code to GitHub first
git add .
git commit -m "Slack AI Gateway ready for deployment"
git push origin main
```

### 3. Deploy on Railway

- Click "New Project" → "Deploy from GitHub repo"
- Select your repository
- Railway will auto-detect Python/FastAPI
- Set environment variables in Railway dashboard

### 4. Get Your Domain

- Railway provides a `*.up.railway.app` domain
- Use this for Slack webhook URLs

## Option 2: Render

### 1. Create Render Account

- Go to [render.com](https://render.com)
- Free tier: 750 hours/month

### 2. Deploy Web Service

- Click "New" → "Web Service"
- Connect your GitHub repo
- Runtime: Python 3
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

### 3. Environment Variables

Set these in Render dashboard:

```
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
DATABASE_URL=mssql+pymssql://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai
# ... other env vars
```

## Option 3: Fly.io

### 1. Install Fly CLI

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh
fly auth login
```

### 2. Create fly.toml

```toml
app = "slack-ai-gateway"
primary_region = "iad"

[build]
  dockerfile = "services/gateway/Dockerfile"

[env]
  PORT = "8080"

[http_service]
  internal_port = 8080
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0
```

### 3. Deploy

```bash
fly launch
fly deploy
```

## 📋 For All Cloud Deployments:

### Required Environment Variables:

```
SLACK_SIGNING_SECRET=your-signing-secret-here
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
DATABASE_URL=mssql+pymssql://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai
REDIS_URL=redis://redis:6380
MINIO_ENDPOINT=minio:9000
# ... other vars
```

### Update Slack App Webhooks:

- Replace `localhost:8000` with your cloud domain
- Example: `https://your-app.up.railway.app/slack/commands`

### Database Considerations:

- For cloud deployment, consider using a cloud database
- Railway/Render provide PostgreSQL databases
- Update `DATABASE_URL` accordingly

## 🎯 Quick Railway Deployment:

1. **Push to GitHub**
2. **Railway Dashboard** → New Project → GitHub repo
3. **Environment Variables** → Add all from `.env`
4. **Deploy** → Get domain like `slack-ai-gateway.up.railway.app`
5. **Update Slack App** with new webhook URLs

**This gives you a stable, always-on endpoint! 🚀**
