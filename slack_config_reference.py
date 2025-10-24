#!/usr/bin/env python3
"""
Slack App Configuration Quick Reference
Copy-paste settings for your Slack app
"""
import os
from pathlib import Path
from dotenv import load_dotenv

def show_slack_config():
    """Display Slack app configuration settings"""

    # Load environment
    env_file = Path(".env")
    if env_file.exists():
        load_dotenv(env_file)

    print("🔧 Slack App Configuration - Copy-Paste Settings")
    print("=" * 60)

    print("\n📋 BASIC INFORMATION:")
    print("- App Name: AI Gateway Bot")
    print("- Description: AI-powered 3D rendering and analysis assistant")

    print("\n🔑 APP CREDENTIALS:")
    print("- Signing Secret:", os.getenv("SLACK_SIGNING_SECRET", "NOT SET"))
    print("- Bot Token:", os.getenv("SLACK_BOT_TOKEN", "NOT SET"))

    print("\n🌐 WEBHOOK URLS (Replace YOUR_DOMAIN with your actual domain):")
    print("- Commands: https://YOUR_DOMAIN/slack/commands")
    print("- Events: https://YOUR_DOMAIN/slack/events")
    print("- Interactive: https://YOUR_DOMAIN/slack/interactive")

    print("\n⚡ SLASH COMMANDS:")
    commands = [
        ("/render", "Create 3D renders and visualizations", "[description of what to render]"),
        ("/analyze", "Analyze text, images, or data", "[text or file to analyze]"),
        ("/ai", "General AI assistant queries", "[your question or request]")
    ]

    for cmd, desc, hint in commands:
        print(f"- Command: {cmd}")
        print(f"  URL: https://YOUR_DOMAIN/slack/commands")
        print(f"  Description: {desc}")
        print(f"  Usage Hint: {hint}")
        print()

    print("🔐 BOT TOKEN SCOPES (OAuth & Permissions):")
    scopes = [
        "app_mentions:read", "channels:history", "channels:read",
        "chat:write", "chat:write.public", "commands",
        "files:read", "files:write", "im:history", "im:read", "im:write",
        "mpim:history", "mpim:read", "users:read", "users:read.email"
    ]

    for scope in scopes:
        print(f"- {scope}")

    print("\n📣 BOT EVENTS (Event Subscriptions):")
    events = [
        "app_mention", "message.im", "message.mpim"
    ]

    for event in events:
        print(f"- {event}")

    print("\n🧪 TEST COMMANDS (after setup):")
    print("- /render Create a 3D scene of a spaceship")
    print("- /analyze Analyze this text for sentiment")
    print("- /ai What is the capital of France?")

    print("\n📝 REMEMBER:")
    print("- Install the app to your workspace")
    print("- For local dev: use ngrok (ngrok http 8000)")
    print("- Replace YOUR_DOMAIN with your ngrok HTTPS URL")

if __name__ == "__main__":
    show_slack_config()
