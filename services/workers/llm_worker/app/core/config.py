"""
Configuration settings for the LLM Worker
"""

import os
from typing import Optional
from pydantic import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Redis configuration
    redis_url: str = "redis://redis:6379/0"

    # Celery configuration
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/0"

    # Abacus.AI configuration
    abacus_api_key: str

    # OpenAI configuration
    openai_api_key: str

    # LM Studio configuration
    lm_studio_base_url: str = "http://localhost:1234/v1"

    # Storage configuration
    s3_endpoint_url: str = "http://minio:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Application settings
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
