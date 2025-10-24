#!/usr/bin/env python3
"""
Ngrok Setup Helper for Slack Webhooks
"""
import subprocess
import sys
import time

def setup_ngrok():
    """Help set up ngrok for Slack webhooks"""
    print("🚀 Slack Webhook Setup with ngrok")
    print("=" * 40)

    print("\n📋 Prerequisites:")
    print("- Install ngrok: https://ngrok.com/download")
    print("- Your gateway should be running: http://localhost:8000")

    print("\n🔧 Step 1: Start ngrok")
    print("Run this command in a new terminal:")
    print("ngrok http 8000")

    print("\n🔧 Step 2: Copy the HTTPS URL")
    print("Look for a line like:")
    print("Forwarding    https://abc123.ngrok.io -> http://localhost:8000")
    print("Copy the HTTPS URL (e.g., https://abc123.ngrok.io)")

    print("\n🔧 Step 3: Update Slack App Webhooks")
    print("In your Slack app dashboard:")
    print("- Slash Commands: https://YOUR_URL/slack/commands")
    print("- Event Subscriptions: https://YOUR_URL/slack/events")
    print("- Interactivity: https://YOUR_URL/slack/interactive")

    print("\n🔧 Step 4: Test the Setup")
    print("In Slack, try:")
    print("/render Create a spaceship")
    print("/analyze Hello world")
    print("/ai What is AI?")

    print("\n📊 Verify Integration:")
    print("- Check database: python check_database.py")
    print("- View logs: docker-compose logs gateway")

    # Try to detect if ngrok is running
    try:
        result = subprocess.run(['ngrok', 'api', 'tunnels'], capture_output=True, text=True, timeout=5)
        if result.returncode == 0 and 'tunnels' in result.stdout:
            print("\n✅ ngrok detected! Check your ngrok dashboard for the URL.")
        else:
            print("\n⚠️  ngrok not detected. Make sure it's installed and running.")
    except (subprocess.TimeoutExpired, FileNotFoundError):
        print("\n⚠️  ngrok not detected. Make sure it's installed and running.")

if __name__ == "__main__":
    setup_ngrok()