# Slack AI Gateway - Integration Guide

## 🚀 System Status: READY FOR SLACK INTEGRATION

Your Slack AI Gateway is fully operational and ready to connect to Slack!

## 📋 Prerequisites

- ✅ Docker Compose environment running
- ✅ SQL Server database connected
- ✅ Slack credentials configured
- ✅ Gateway responding on port 8000

## 🔗 Step 1: Get Your Webhook URLs

For **local development**, you'll need to expose your local server to the internet. Use ngrok:

```bash
# Install ngrok (if not installed)
# Download from: https://ngrok.com/download

# Expose your local gateway
ngrok http 8000

# Copy the HTTPS URL (e.g., https://abc123.ngrok.io)
```

Your webhook URLs will be:

- **Commands**: `https://your-ngrok-url.ngrok.io/slack/commands`
- **Events**: `https://your-ngrok-url.ngrok.io/slack/events`

## ⚙️ Step 2: Configure Slack App

### Create Slack App

1. Go to [Slack API](https://api.slack.com/apps)
2. Click "Create New App" → "From scratch"
3. Name: "AI Gateway Bot"
4. Select your workspace

### Configure Features

#### 1. Slash Commands

Add these slash commands in "Slash Commands" section:

| Command    | Request URL                                      | Description           |
| ---------- | ------------------------------------------------ | --------------------- |
| `/render`  | `https://your-ngrok-url.ngrok.io/slack/commands` | 3D rendering requests |
| `/analyze` | `https://your-ngrok-url.ngrok.io/slack/commands` | Text analysis         |
| `/ai`      | `https://your-ngrok-url.ngrok.io/slack/commands` | General AI queries    |

#### 2. Event Subscriptions

In "Event Subscriptions":

- **Request URL**: `https://your-ngrok-url.ngrok.io/slack/events`
- Subscribe to these bot events:
  - `app_mention`
  - `message.im` (direct messages)

#### 3. OAuth Permissions

Add these scopes in "OAuth & Permissions":

- `commands` - Execute slash commands
- `chat:write` - Send messages
- `im:read` - Read direct messages
- `mpim:read` - Read group messages

### Install App

1. Install the app to your workspace
2. Copy the **Bot User OAuth Token** (starts with `xoxb-`)
3. Update your `.env` file if needed

## 🧪 Step 3: Test Integration

### Test Commands

```bash
# Test slash commands
/render Create a 3D scene of a futuristic city
/analyze Analyze this text: "I love this amazing product!"
/ai What is the capital of France?
```

### Test Direct Messages

Send a direct message to your bot:

```
@YourBot render a spaceship
```

### Verify Database

Check that commands are logged:

```bash
python check_database.py
```

## 📊 Monitoring

### Health Check

```bash
curl http://localhost:8000/health
```

### View Logs

```bash
docker-compose logs -f gateway
```

### Database Status

```bash
python check_database.py
```

## 🔧 Troubleshooting

### Common Issues

**"Invalid request signature"**

- Verify SLACK_SIGNING_SECRET in .env matches Slack app
- Check ngrok URL is correct

**"Command not working"**

- Ensure slash commands are configured with correct URLs
- Check gateway logs for errors

**"No response from bot"**

- Verify bot has necessary permissions
- Check Redis/Celery are running

### Debug Commands

```bash
# Check all services
docker-compose ps

# View gateway logs
docker-compose logs gateway

# Test database connection
python check_database.py

# Test health
curl http://localhost:8000/health
```

## 🎯 What's Working

- ✅ Slack command processing
- ✅ Database persistence
- ✅ Job queuing system
- ✅ Error handling
- ✅ Structured logging

## 🚀 Next Steps

1. **Add LLM API Keys** - Configure OpenAI, Abacus AI, or LM Studio
2. **Deploy to Production** - Set up proper domain and SSL
3. **Add More Features** - File uploads, interactive messages
4. **Monitoring** - Set up alerts and dashboards

## 📞 Support

If you encounter issues:

1. Check the logs: `docker-compose logs gateway`
2. Verify configuration in `.env`
3. Test individual components
4. Check database connectivity

**Your Slack AI Gateway is ready! 🎉**
