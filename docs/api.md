# API Documentation

## Gateway Endpoints

### POST /slack/commands

Handle Slack slash commands.

**Request Body:**

```json
{
  "token": "slack-token",
  "team_id": "team-id",
  "channel_id": "channel-id",
  "user_id": "user-id",
  "command": "/render",
  "text": "Create a 3D cube scene",
  "response_url": "https://hooks.slack.com/..."
}
```

**Response:**

```json
{
  "response_type": "in_channel",
  "text": "Processing your request..."
}
```

### POST /slack/events

Handle Slack events (mentions, messages).

**Request Body:**

```json
{
  "type": "event_callback",
  "event": {
    "type": "app_mention",
    "text": "<@BOT> render a scene",
    "channel": "C123456",
    "user": "U123456"
  }
}
```

### GET /health

Health check endpoint.

**Response:**

```json
{
  "status": "healthy",
  "timestamp": "2025-01-24T10:30:00Z"
}
```

### GET /jobs/{job_id}

Get job status.

**Response:**

```json
{
  "job_id": "12345-abcde",
  "status": "completed",
  "result": {
    "output_files": 1,
    "uploaded_urls": ["https://storage.example.com/render_001.png"]
  }
}
```

## Worker Tasks

### LLM Worker Tasks

#### analyze_content

Analyze text content using AI.

**Parameters:**

```json
{
  "content": "Text to analyze",
  "analysis_type": "sentiment"
}
```

**Result:**

```json
{
  "content_type": "text",
  "sentiment": "positive",
  "topics": ["AI", "automation"],
  "summary": "Analysis summary..."
}
```

#### generate_text

Generate text using AI.

**Parameters:**

```json
{
  "prompt": "Write a haiku about AI",
  "max_length": 100
}
```

**Result:**

```json
{
  "generated_text": "Generated text content...",
  "model_used": "gpt-4",
  "tokens_used": 45
}
```

### Blender Worker Tasks

#### render_scene

Render a 3D scene.

**Parameters:**

```json
{
  "scene": "cube.blend",
  "output_format": "png",
  "resolution": [1920, 1080],
  "frame_start": 1,
  "frame_end": 1
}
```

**Result:**

```json
{
  "job_id": "render_123",
  "output_files": 1,
  "uploaded_urls": ["https://storage.example.com/render_123.png"],
  "render_settings": {
    "resolution": [1920, 1080],
    "format": "png",
    "frames": "1-1"
  }
}
```

#### modify_scene

Modify a Blender scene programmatically.

**Parameters:**

```json
{
  "scene": "template.blend",
  "modifications": [
    {
      "type": "add_cube",
      "size": 2.0,
      "location": [0, 0, 0]
    },
    {
      "type": "add_light",
      "light_type": "POINT",
      "location": [5, 5, 5]
    }
  ]
}
```

**Result:**

```json
{
  "job_id": "modify_456",
  "scene_url": "https://storage.example.com/modified_456.blend",
  "modifications_applied": 2
}
```

## Error Handling

All endpoints return appropriate HTTP status codes:

- `200`: Success
- `400`: Bad Request
- `403`: Forbidden (invalid Slack signature)
- `500`: Internal Server Error

Error responses include:

```json
{
  "detail": "Error description"
}
```

## Authentication

- Slack requests are verified using signing secrets
- API keys are required for external services
- All worker communications use secure channels

## Rate Limiting

- Slack commands: Limited by Slack's built-in rate limits
- API endpoints: No additional rate limiting (add as needed)
- Worker tasks: Queued and processed asynchronously

## Monitoring

- Health checks available at `/health`
- Structured JSON logging
- Celery task monitoring via Flower UI
- Prometheus metrics (planned)
