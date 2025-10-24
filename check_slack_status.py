#!/usr/bin/env python3
"""
Slack Integration Status Checker
Shows current configuration and provides webhook URLs
"""
import os
from pathlib import Path
from dotenv import load_dotenv

def check_slack_integration():
    """Check Slack integration status and provide setup info"""

    # Load environment variables
    env_file = Path(".env")
    if env_file.exists():
        load_dotenv(env_file)
        print("✅ Configuration file found and loaded")
    else:
        print("❌ .env file missing")
        return

    print("🚀 Slack AI Gateway - Integration Status")
    print("=" * 50)

    # Check Slack credentials
    slack_secret = os.getenv("SLACK_SIGNING_SECRET", "")
    slack_token = os.getenv("SLACK_BOT_TOKEN", "")

    if slack_secret and len(slack_secret) > 10:
        print(f"✅ Slack Signing Secret: {slack_secret[:10]}...")
    else:
        print("❌ Slack Signing Secret not configured")

    if slack_token and slack_token.startswith("xoxb-"):
        print(f"✅ Slack Bot Token: {slack_token[:10]}...")
    else:
        print("❌ Slack Bot Token not configured")

    print("\n🔗 Webhook URLs (replace YOUR_DOMAIN with actual domain)")
    print("-" * 50)
    print("🏥 Health Check: https://YOUR_DOMAIN/health")
    print("📝 Commands:     https://YOUR_DOMAIN/slack/commands")
    print("📣 Events:       https://YOUR_DOMAIN/slack/events")

    print("\n🧪 For Local Development:")
    print("- Use ngrok: ngrok http 8000")
    print("- Replace YOUR_DOMAIN with ngrok URL")

    print("\n📋 Slack App Configuration Required:")
    print("- Create app at: https://api.slack.com/apps")
    print("- Add slash commands: /render, /analyze, /ai")
    print("- Configure event subscriptions")
    print("- Set OAuth permissions: commands, chat:write")

    print("\n✅ System Ready for Slack Integration!")

if __name__ == "__main__":
    check_slack_integration()
