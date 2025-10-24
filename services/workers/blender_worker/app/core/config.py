"""
Configuration settings for the Blender Worker
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Redis configuration
    redis_url: str = "redis://redis:6379/0"

    # Celery configuration
    celery_broker_url: str = "redis://redis:6379/0"
    celery_result_backend: str = "redis://redis:6379/0"

    # Storage configuration
    s3_endpoint_url: str = "http://minio:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Blender settings
    blender_path: str = "/opt/blender/blender"
    assets_dir: str = "/app/assets"
    cache_dir: str = "/app/cache"
    output_dir: str = "/app/output"

    # Application settings
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
