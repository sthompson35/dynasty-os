"""
Configuration settings for Dynasty OS Gateway.
Single source of truth for all environment-driven settings.
"""

from typing import Optional
from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings — all values sourced from environment variables."""

    # Application environment
    app_env: str = "development"  # "development" | "staging" | "production"
    debug: bool = False
    log_level: str = "INFO"

    # Database configuration (single source of truth)
    database_url: str = "sqlite:///./test.db"

    # Redis configuration
    redis_url: str = "redis://localhost:6379/0"

    # Celery configuration
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # Slack configuration
    slack_signing_secret: Optional[str] = None
    slack_bot_token: Optional[str] = None
    slack_client_id: Optional[str] = None
    slack_client_secret: Optional[str] = None
    slack_verification_token: Optional[str] = None
    slack_app_id: Optional[str] = None

    # AI provider configuration
    abacus_api_key: Optional[str] = None
    openai_api_key: Optional[str] = None
    lm_studio_base_url: str = "http://host.docker.internal:1234/v1"

    # Storage configuration (S3-compatible)
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Supabase configuration (Workstream 2 — env-driven, no hardcoded secrets)
    supabase_url: Optional[str] = None
    supabase_service_role_key: Optional[str] = None
    supabase_db_schema: str = "public"

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        """Enforce required values when running in production mode."""
        if self.app_env == "production":
            if self.database_url.startswith("sqlite"):
                raise ValueError(
                    "SQLite is not supported in production. "
                    "Set DATABASE_URL to a PostgreSQL connection string."
                )
            missing: list[str] = []
            if not self.slack_signing_secret:
                missing.append("SLACK_SIGNING_SECRET")
            if not self.slack_bot_token:
                missing.append("SLACK_BOT_TOKEN")
            if missing:
                raise ValueError(
                    f"Missing required production secrets: {', '.join(missing)}"
                )
        return self

    class Config:
        env_file = ".env"
        case_sensitive = False


# Global settings instance
settings = Settings()
