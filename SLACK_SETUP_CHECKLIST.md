# ✅ Slack App Configuration Checklist

## Pre-Setup Requirements

- [x] Slack AI Gateway running on port 8000
- [x] SQL Server database connected
- [x] Environment variables configured
- [x] ngrok installed (for local development)

## Slack App Creation

- [ ] Go to https://api.slack.com/apps
- [ ] Click "Create New App" → "From scratch"
- [ ] App Name: `AI Gateway Bot`
- [ ] Select your workspace
- [ ] Click "Create App"

## Basic Information

- [ ] Set display name and description
- [ ] Note the Signing Secret: `3fc2ce06811d995f45b3f70dc8b517c6`

## OAuth & Permissions

- [ ] Add all 15 bot token scopes listed in `slack_config_reference.py`
- [ ] Click "Install to Workspace"
- [ ] Authorize the app
- [ ] Copy Bot User OAuth Token: `xoxb-your-bot-token-here`

## Slash Commands

- [ ] Add `/render` command with URL: `https://YOUR_DOMAIN/slack/commands`
- [ ] Add `/analyze` command with URL: `https://YOUR_DOMAIN/slack/commands`
- [ ] Add `/ai` command with URL: `https://YOUR_DOMAIN/slack/commands`

## Event Subscriptions

- [ ] Enable Events: ON
- [ ] Request URL: `https://YOUR_DOMAIN/slack/events`
- [ ] Subscribe to bot events: `app_mention`, `message.im`, `message.mpim`

## Interactivity

- [ ] Enable Interactivity: ON
- [ ] Request URL: `https://YOUR_DOMAIN/slack/interactive`

## Domain Setup

- [ ] For local dev: Run `ngrok http 8000`
- [ ] Copy HTTPS URL (e.g., `https://abc123.ngrok.io`)
- [ ] Replace `YOUR_DOMAIN` with your ngrok URL in all webhook settings

## Testing

- [ ] Install app to workspace
- [ ] Test `/render Create a spaceship`
- [ ] Test `/analyze Analyze this text`
- [ ] Test `/ai What is the weather?`
- [ ] Check database: `python check_database.py`
- [ ] Verify logs: `docker-compose logs gateway`

## Files Created

- [x] `SLACK_APP_SETUP.md` - Complete setup guide
- [x] `slack_config_reference.py` - Copy-paste settings
- [x] `check_slack_status.py` - Status checker
- [x] `SLACK_INTEGRATION_README.md` - Integration overview

## Ready to Go! 🚀

Once all checkboxes are complete, your Slack AI Gateway will be fully integrated!
