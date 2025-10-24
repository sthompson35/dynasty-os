# Slack AI Gateway - Modular Event-Driven Architecture

A production-ready, event-driven system that integrates Slack with AI/3D rendering capabilities using Abacus.AI RouteLLM, OpenAI, LM Studio, and Blender.

## Architecture Overview

```
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   Slack     │────│  Gateway    │────│  Workers    │
│  Commands   │    │  (FastAPI)  │    │  (Celery)   │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
       ▼                   ▼                   ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ Abacus.AI   │    │   Redis     │    │   Blender   │
│ RouteLLM    │    │   Queue     │    │   Worker    │
└─────────────┘    └─────────────┘    └─────────────┘
       │                   │                   │
       │                   │                   │
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│   OpenAI    │    │ SQL Server  │    │    S3      │
│   (Cloud)   │    │  Database   │    │  Storage   │
└─────────────┘    └─────────────┘    └─────────────┘
```

## Features

- **Slack Integration**: Slash commands and event handling
- **Intelligent LLM Routing**: Abacus.AI RouteLLM for optimal model selection
- **Multi-Provider Support**: OpenAI, LM Studio, and routed models
- **3D Rendering**: Blender headless rendering with Python scripting
- **Event-Driven**: Celery task queues for asynchronous processing
- **Object Storage**: S3-compatible storage for outputs
- **Database Storage**: SQL Server for job history, user data, and analytics
- **Monitoring**: Structured logging and health checks

## Quick Start

### Prerequisites

- Docker Desktop
- Slack App with bot token and signing secret
- Abacus.AI API key
- OpenAI API key (optional)
- LM Studio running locally (optional)

### Setup

1. **Clone and configure**:

   ```bash
   git clone <repository>
   cd slack-ai-gateway
   cp .env.example .env
   ```

2. **Configure environment**:
   Edit `.env` with your API keys and tokens.

3. **Start services**:

   ```bash
   docker-compose up --build -d
   ```

4. **Check health**:
   ```bash
   curl http://localhost:8000/health
   ```

## Services

### Gateway (Port 8000)

- **Framework**: FastAPI
- **Purpose**: Handles Slack webhooks, job orchestration
- **Features**: Request validation, LLM routing, task queuing

### LLM Worker

- **Framework**: Celery
- **Purpose**: AI inference and text analysis
- **Providers**: Abacus.AI RouteLLM, OpenAI, LM Studio

### Blender Worker

- **Framework**: Celery + Blender
- **Purpose**: 3D scene rendering and manipulation
- **Features**: Headless rendering, Python scripting

### SQL Server (Port 1433)

- **Purpose**: Persistent database storage
- **Features**: Job history, user data, analytics, audit logs
- **Database**: `slack_ai` with tables for jobs, messages, and analytics

### Redis (Port 6379)

- **Purpose**: Message queue and result backend
- **Features**: Celery broker, caching

### MinIO (Port 9000/9001)

- **Purpose**: Local S3-compatible object storage
- **Features**: File uploads, static hosting

## Configuration

### Slack App Setup

1. Create a Slack App at https://api.slack.com/apps
2. Add features:
   - **Slash Commands**: `/render`, `/analyze`, etc.
   - **Event Subscriptions**: `app_mention`, `message.channels`
   - **Permissions**: `chat:write`, `files:write`, etc.
3. Install to workspace and copy tokens

### Environment Variables

```bash
# Slack
SLACK_SIGNING_SECRET=your-signing-secret
SLACK_BOT_TOKEN=xoxb-your-bot-token

# AI Providers
ABACUS_API_KEY=your-abacus-key
OPENAI_API_KEY=your-openai-key
LM_STUDIO_BASE_URL=http://host.docker.internal:1234/v1

# Storage
S3_ENDPOINT_URL=http://minio:9000
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin
S3_BUCKET_NAME=slack-ai-outputs

# Database
DATABASE_URL=mssql+pyodbc://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai?driver=ODBC+Driver+18+for+SQL+Server
```

## Usage Examples

### Render Command

```
/render Create a 3D scene with a rotating cube and upload the result
```

### Analysis Command

```
/analyze What sentiment does this text convey: "I love this new AI system!"
```

### Custom Commands

The system uses LLM routing to interpret natural language commands and convert them into structured actions.

## Development

### Local Development

```bash
# Start only gateway for development
docker-compose up gateway redis

# Run workers locally
celery -A services.workers.llm_worker.app worker -Q llm
celery -A services.workers.blender_worker.app worker -Q blender
```

### Testing

```bash
# Run gateway tests
cd services/gateway
pytest

# Run worker tests
cd services/workers/llm_worker
pytest
```

### Adding New Commands

1. Add command handler in `gateway/main.py`
2. Create worker task in appropriate worker service
3. Update LLM router for command interpretation

## Monitoring

- **Health Checks**: `/health` endpoint
- **Task Monitoring**: Flower UI at http://localhost:5555
- **Logs**: Structured JSON logging with correlation IDs
- **Metrics**: Prometheus-compatible metrics (future)

## Security

- Slack request signature verification
- Environment variable secrets management
- Input validation and sanitization
- Rate limiting and abuse prevention

## Deployment

### Local Development (with Tunneling)

For local development with Slack webhooks, you need to expose your local server:

```bash
# Install localtunnel globally
npm install -g localtunnel

# Start tunnel on port 8000
lt --port 8000 --subdomain your-app-name

# Use the generated URL (e.g., https://your-app-name.loca.lt) in Slack app settings
```

### Cloud Deployment Options

#### Railway (Recommended - Easiest)

1. **Push to GitHub**:

   ```bash
   git add .
   git commit -m "Ready for deployment"
   git push origin main
   ```

2. **Deploy on Railway**:

   - Go to [railway.app](https://railway.app)
   - Create new project from GitHub repo
   - Railway auto-detects Python/FastAPI
   - Set environment variables in dashboard

3. **Use Railway domain** for Slack webhooks (e.g., `https://your-app.up.railway.app/slack/commands`)

#### Render

1. **Connect GitHub repo** to Render
2. **Create Web Service**:
   - Runtime: Python 3
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`

#### Fly.io

1. **Install Fly CLI**:

   ```bash
   curl -L https://fly.io/install.sh | sh
   fly auth login
   ```

2. **Deploy**:
   ```bash
   fly launch
   fly deploy
   ```

### Production Deployment

```bash
# Build for production
docker-compose -f docker-compose.prod.yml up --build -d

# Scale workers
docker-compose up --scale llm_worker=3 --scale blender_worker=2
```

### Environment-Specific Configs

- `docker-compose.yml`: Development
- `docker-compose.prod.yml`: Production
- `docker-compose.test.yml`: Testing

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Documentation**: See `/docs` directory
- **Issues**: GitHub Issues
- **Discussions**: GitHub Discussions

---

Built with ❤️ using FastAPI, Celery, Blender, and modern AI tooling.
