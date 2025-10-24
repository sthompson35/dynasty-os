# 🚀 Slack App Configuration Guide

## Step-by-Step Setup for Your AI Gateway Bot

### 📋 Prerequisites

- Your Slack AI Gateway is running on `http://localhost:8000`
- For local development, you'll need ngrok: `ngrok http 8000`

---

## 1️⃣ Create Your Slack App

### Go to Slack API

1. Open [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"**
3. Select **"From scratch"**
4. **App Name**: `AI Gateway Bot`
5. **Select Workspace**: Choose your workspace
6. Click **"Create App"**

---

## 2️⃣ Configure Basic Information

### App-Level Tokens (Optional but Recommended)

1. Go to **"Basic Information"** → **"App-Level Tokens"**
2. Click **"Generate Token and Scopes"**
3. **Token Name**: `ai-gateway-token`
4. **Scopes**: Add `connections:write`
5. Click **"Generate"**
6. **Copy and save** the token (starts with `xapp-`)

---

## 3️⃣ Set Up OAuth Permissions

### Scopes Configuration

1. Go to **"OAuth & Permissions"** section
2. Under **"Scopes"**, add these **Bot Token Scopes**:

```
✅ app_mentions:read     - Read messages that mention your app
✅ channels:history      - Access channel message history
✅ channels:read         - Access basic information about public channels
✅ chat:write           - Send messages as your app
✅ chat:write.public    - Send messages to channels your app isn't in
✅ commands             - Execute slash commands
✅ files:read           - Access files uploaded to Slack
✅ files:write          - Upload files to Slack
✅ im:history           - Access direct message history
✅ im:read              - Access basic information about direct messages
✅ im:write             - Send direct messages
✅ mpim:history         - Access group message history
✅ mpim:read            - Access basic information about group messages
✅ users:read           - Access user information
✅ users:read.email     - Access user email addresses
```

3. Click **"Install to Workspace"**
4. **Authorize** the app
5. **Copy the Bot User OAuth Token** (starts with `xoxb-`)
6. **Update your `.env` file** with this token if different

---

## 4️⃣ Configure Slash Commands

### Add Commands

1. Go to **"Slash Commands"** section
2. Click **"Create New Command"** for each:

#### Command 1: `/render`

```
Command: /render
Request URL: https://YOUR_DOMAIN/slack/commands
Short Description: Create 3D renders and visualizations
Usage Hint: [description of what to render]
```

#### Command 2: `/analyze`

```
Command: /analyze
Request URL: https://YOUR_DOMAIN/slack/commands
Short Description: Analyze text, images, or data
Usage Hint: [text or file to analyze]
```

#### Command 3: `/ai`

```
Command: /ai
Request URL: https://YOUR_DOMAIN/slack/commands
Short Description: General AI assistant queries
Usage Hint: [your question or request]
```

**⚠️ IMPORTANT**: Replace `YOUR_DOMAIN` with your actual domain or ngrok URL!

---

## 5️⃣ Set Up Event Subscriptions

### Enable Events

1. Go to **"Event Subscriptions"** section
2. Turn **"Enable Events"** to **ON**

### Request URL

```
Request URL: https://YOUR_DOMAIN/slack/events
```

### Subscribe to Bot Events

Add these **Bot Events**:

```
✅ app_mention          - When someone mentions your app
✅ message.im           - Direct messages to your bot
✅ message.mpim         - Messages in group DMs
✅ message.channels     - Messages in public channels (if needed)
```

### Subscribe to Workspace Events (Optional)

```
✅ message.im           - All direct messages
✅ message.mpim         - All group messages
```

---

## 6️⃣ Configure Interactive Components

### Interactivity Settings

1. Go to **"Interactivity & Shortcuts"** section
2. Turn **"Interactivity"** to **ON**
3. **Request URL**: `https://YOUR_DOMAIN/slack/interactive`
4. **Options Load URL**: `https://YOUR_DOMAIN/slack/options` (if needed)

---

## 7️⃣ Set Up App Manifest (Alternative Method)

If you prefer using the manifest, here's the complete configuration:

```yaml
display_information:
  name: AI Gateway Bot
  description: AI-powered 3D rendering and analysis bot
  background_color: '#4A154B'

features:
  bot_user:
    display_name: AI Gateway
    always_online: true

oauth_config:
  scopes:
    bot:
      - app_mentions:read
      - channels:history
      - channels:read
      - chat:write
      - chat:write.public
      - commands
      - files:read
      - files:write
      - im:history
      - im:read
      - im:write
      - mpim:history
      - mpim:read
      - users:read
      - users:read.email

settings:
  event_subscriptions:
    request_url: https://YOUR_DOMAIN/slack/events
    bot_events:
      - app_mention
      - message.im
      - message.mpim

  interactivity:
    is_enabled: true
    request_url: https://YOUR_DOMAIN/slack/interactive

  slash_commands:
    - command: /render
      url: https://YOUR_DOMAIN/slack/commands
      description: Create 3D renders and visualizations
      usage_hint: '[description of what to render]'
      should_escape: false

    - command: /analyze
      url: https://YOUR_DOMAIN/slack/commands
      description: Analyze text, images, or data
      usage_hint: '[text or file to analyze]'
      should_escape: false

    - command: /ai
      url: https://YOUR_DOMAIN/slack/commands
      description: General AI assistant queries
      usage_hint: '[your question or request]'
      should_escape: false

  org_deploy_enabled: false
  socket_mode_enabled: false
  token_rotation_enabled: false
```

---

## 8️⃣ Get Your Signing Secret

### App Credentials

1. Go to **"Basic Information"** → **"App Credentials"**
2. **Copy the Signing Secret** (starts with your existing secret)
3. **Verify it matches** your `.env` file

---

## 9️⃣ Install and Test

### Install App

1. Go to **"Install App"** section
2. Click **"Install to Workspace"**
3. **Authorize** all requested permissions

### Test Commands

In Slack, try these commands:

```
/render Create a 3D scene of a futuristic city
/analyze Analyze this text: "I love this amazing product!"
/ai What is the capital of France?
```

### Test Direct Messages

Send a DM to your bot:

```
@AI Gateway render a spaceship
```

---

## 🔧 Troubleshooting

### Common Issues

**"Invalid request signature"**

- Check that your Signing Secret matches exactly
- Verify the Request URL is correct and HTTPS

**"Missing scope" errors**

- Reinstall the app with all required scopes
- Check OAuth & Permissions section

**"Command not responding"**

- Verify slash command URLs are correct
- Check gateway logs: `docker-compose logs gateway`

**"Events not working"**

- Confirm Event Subscriptions are enabled
- Check the Request URL is accessible

### Debug Steps

```bash
# Check gateway health
curl http://localhost:8000/health

# View recent logs
docker-compose logs --tail=50 gateway

# Test database
python check_database.py
```

---

## 📝 Your Configuration Summary

**App Name**: AI Gateway Bot
**Workspace**: [Your Workspace Name]
**Bot Token**: `xoxb-your-bot-token-here`
**Signing Secret**: `3fc2ce06811d995f45b3f70dc8b517c6`

**Webhook URLs** (replace YOUR_DOMAIN):

- Commands: `https://YOUR_DOMAIN/slack/commands`
- Events: `https://YOUR_DOMAIN/slack/events`
- Interactive: `https://YOUR_DOMAIN/slack/interactive`

---

## 🎉 Ready to Go!

Once configured, your Slack AI Gateway will:

- ✅ Accept slash commands (`/render`, `/analyze`, `/ai`)
- ✅ Respond to @mentions
- ✅ Process requests through your AI workers
- ✅ Store all interactions in SQL Server
- ✅ Handle file uploads and downloads

**Happy integrating! 🚀**
