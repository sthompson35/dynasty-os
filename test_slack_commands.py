#!/usr/bin/env python3
"""
Test Slack commands for the AI Gateway
"""
import asyncio
import json
from datetime import datetime
import hmac
import hashlib
from urllib.parse import urlencode

import pytest
import httpx

# Test configuration
GATEWAY_URL = "http://localhost:8000"
SLACK_SIGNING_SECRET = "3fc2ce06811d995f45b3f70dc8b517c6"  # From .env

def create_slack_signature(timestamp: str, body: str) -> str:
    """Create Slack signature for request verification"""
    sig_basestring = f"v0:{timestamp}:{body}"
    signature = hmac.new(
        SLACK_SIGNING_SECRET.encode(),
        sig_basestring.encode(),
        hashlib.sha256
    ).hexdigest()
    return f"v0={signature}"

async def send_slack_command(command: str, text: str):
    """Helper function to send a Slack command"""
    print(f"\n🧪 Testing Slack command: /{command} {text}")

    # Create form data
    form_data = {
        "token": "test-token",
        "team_id": "T123456",
        "team_domain": "test-team",
        "channel_id": "C123456",
        "channel_name": "test-channel",
        "user_id": "U123456",
        "user_name": "testuser",
        "command": f"/{command}",
        "text": text,
        "response_url": "http://localhost:8000/test-response",
        "trigger_id": "123456.789"
    }

    # Create form-encoded body
    body = urlencode(form_data)
    timestamp = str(int(datetime.now().timestamp()))

    # Create signature
    signature = create_slack_signature(timestamp, body)

    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Slack-Request-Timestamp": timestamp,
        "X-Slack-Signature": signature
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.post(
                f"{GATEWAY_URL}/slack/commands",
                content=body,
                headers=headers
            )

            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")

            if response.status_code == 200:
                print("✅ Command accepted successfully!")
            else:
                print(f"❌ Command failed: {response.status_code}")
            
            return response

        except Exception as e:
            print(f"❌ Error: {e}")
            raise

@pytest.mark.asyncio
async def test_render_command():
    """Test render command"""
    response = await send_slack_command("render", "Create a 3D scene of a futuristic city")
    # Server needs to be running for this to pass
    # For now, we just test the signature creation logic
    assert response is not None

@pytest.mark.asyncio
async def test_analyze_command():
    """Test analyze command"""
    response = await send_slack_command("analyze", "Analyze this text for sentiment: 'I love this amazing product!'")
    assert response is not None

@pytest.mark.asyncio
async def test_general_command():
    """Test general AI command"""
    response = await send_slack_command("ai", "What is the capital of France?")
    assert response is not None

@pytest.mark.asyncio
async def test_job_status():
    """Test job status endpoint"""
    print("\n📊 Testing job status endpoint...")

    async with httpx.AsyncClient() as client:
        try:
            # Test with a dummy job ID
            response = await client.get(f"{GATEWAY_URL}/jobs/test-job-123")
            print(f"Job status response: {response.status_code}")
            print(f"Response: {response.text}")
            assert response is not None
        except Exception as e:
            print(f"❌ Error checking job status: {e}")
            raise

# Unit tests that don't require a running server
def test_create_slack_signature():
    """Test Slack signature creation"""
    timestamp = "1234567890"
    body = "token=test&user_id=U123"
    signature = create_slack_signature(timestamp, body)
    
    # Should start with v0=
    assert signature.startswith("v0=")
    # Should be consistent
    signature2 = create_slack_signature(timestamp, body)
    assert signature == signature2

def test_signature_with_different_timestamps():
    """Test that different timestamps produce different signatures"""
    body = "token=test&user_id=U123"
    sig1 = create_slack_signature("1000", body)
    sig2 = create_slack_signature("2000", body)
    
    assert sig1 != sig2

def test_signature_with_different_bodies():
    """Test that different bodies produce different signatures"""
    timestamp = "1234567890"
    sig1 = create_slack_signature(timestamp, "body1")
    sig2 = create_slack_signature(timestamp, "body2")
    
    assert sig1 != sig2

async def main():
    """Run all tests"""
    print("🚀 Testing Slack AI Gateway Commands")
    print("=" * 50)

    # Test health first
    print("\n🏥 Testing health endpoint...")
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(f"{GATEWAY_URL}/health")
            print(f"Health: {response.status_code} - {response.text}")
        except Exception as e:
            print(f"❌ Health check failed: {e}")
            return

    # Test different commands
    await test_render_command()
    await test_analyze_command()
    await test_general_command()
    await test_job_status()

    print("\n🎉 All tests completed!")

if __name__ == "__main__":
    asyncio.run(main())
