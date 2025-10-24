#!/usr/bin/env bash
# Alternative Webhook Setup Options
# Since ngrok requires configuration, here are other options

echo "🌐 Webhook Setup Options for Slack Integration"
echo "=============================================="
echo ""

echo "🔧 Option 1: Configure ngrok properly"
echo "1. Go to https://dashboard.ngrok.com"
echo "2. Get your API key from 'Your Authtoken'"
echo "3. Run: ngrok config add-authtoken YOUR_API_KEY"
echo "4. Register a domain or use: ngrok http 8000 --subdomain=your-app-name"
echo ""

echo "🔧 Option 2: Use localtunnel (free alternative)"
echo "1. Install: npm install -g localtunnel"
echo "2. Run: lt --port 8000"
echo "3. Use the generated URL for webhooks"
echo ""

echo "🔧 Option 3: Use Cloudflare Tunnel (free)"
echo "1. Install cloudflared"
echo "2. Run: cloudflared tunnel --url http://localhost:8000"
echo "3. Use the generated URL"
echo ""

echo "🔧 Option 4: Deploy to Railway/Render (free tier)"
echo "- Railway: railway.app (free tier available)"
echo "- Render: render.com (free tier available)"
echo "- Both support direct GitHub deployment"
echo ""

echo "📋 Once you have a public URL (e.g., https://abc123.ngrok.io):"
echo ""
echo "Configure these in your Slack app:"
echo "- Slash Commands: https://YOUR_URL/slack/commands"
echo "- Event Subscriptions: https://YOUR_URL/slack/events"
echo "- Interactivity: https://YOUR_URL/slack/interactive"
echo ""

echo "🧪 Test with:"
echo "/render Create a spaceship"
echo "/analyze Hello world"
echo "/ai What is AI?"
echo ""

echo "📊 Verify:"
echo "python check_database.py  # Check logged commands"
echo "docker-compose logs gateway  # View logs"
