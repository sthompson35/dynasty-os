"""
Configuration settings for the Slack AI Gateway
"""

import os
from typing import Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Redis configuration
    redis_url: str = "redis://localhost:6379/0"

    # Celery configuration
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # Slack configuration
    slack_signing_secret: str
    slack_bot_token: str

    # Abacus.AI configuration
    abacus_api_key: str

    # OpenAI configuration
    openai_api_key: str

    # LM Studio configuration
    lm_studio_base_url: str = "http://localhost:1234/v1"

    # Storage configuration
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Database configuration
    database_url: str = "mssql+pyodbc://sa:YourStrong!Passw0rd@sqlserver:1433/slack_ai?driver=ODBC+Driver+18+for+SQL+Server"
    database_host: str = "sqlserver"
    database_port: int = 1433
    database_name: str = "slack_ai"
    database_user: str = "sa"
    database_password: str = "YourStrong!Passw0rd"

    # Application settings
    debug: bool = False
    log_level: str = "INFO"

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
