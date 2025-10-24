#!/bin/bash

# Slack AI Gateway Setup Script

set -e

echo "🚀 Setting up Slack AI Gateway..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker Desktop and try again."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from template..."
    cp .env.example .env
    echo "⚠️  Please edit .env file with your actual API keys and tokens"
else
    echo "✅ .env file already exists"
fi

# Create necessary directories
echo "📁 Creating directories..."
mkdir -p services/gateway/app/core
mkdir -p services/gateway/app/services
mkdir -p services/workers/llm_worker/app/core
mkdir -p services/workers/blender_worker/app/core
mkdir -p logs
mkdir -p docker/volumes/minio
mkdir -p docker/volumes/redis

# Build and start services
echo "🐳 Building and starting services..."
docker-compose up --build -d

# Wait for services to be healthy
echo "⏳ Waiting for services to start..."
sleep 10

# Check service health
echo "🔍 Checking service health..."
if curl -s http://localhost:8000/health > /dev/null; then
    echo "✅ Gateway is healthy"
else
    echo "❌ Gateway is not responding"
fi

# Create MinIO bucket
echo "🪣 Creating MinIO bucket..."
docker-compose exec minio mc mb minio/slack-ai-outputs || true

echo ""
echo "🎉 Setup complete!"
echo ""
echo "📋 Next steps:"
echo "1. Edit .env file with your actual credentials"
echo "2. Restart services: docker-compose restart"
echo "3. Test with: curl http://localhost:8000/health"
echo "4. Access services:"
echo "   - Gateway: http://localhost:8000"
echo "   - MinIO: http://localhost:9001"
echo "   - Redis Commander: http://localhost:8082"
echo "   - Flower: http://localhost:5555"
echo ""
echo "📚 See README.md for detailed usage instructions"
