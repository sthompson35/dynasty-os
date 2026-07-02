"""
Configuration settings for the Slack AI Gateway
"""

import os
from typing import Dict, Optional
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Redis configuration
    redis_url: str = "redis://localhost:6379/0"

    # Celery configuration
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/0"

    # Slack configuration
    slack_signing_secret: Optional[str] = None
    slack_bot_token: Optional[str] = None
    # Slack app configuration
    slack_client_id: Optional[str] = None
    slack_client_secret: Optional[str] = None
    slack_verification_token: Optional[str] = None
    slack_app_id: Optional[str] = None

    # Abacus.AI configuration
    abacus_api_key: Optional[str] = None

    # OpenAI configuration
    openai_api_key: Optional[str] = None

    # LM Studio configuration
    lm_studio_base_url: str = "http://host.docker.internal:1234/v1"

    # Storage configuration
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Database configuration
    database_url: str = "sqlite:///./test.db"
    database_host: Optional[str] = None
    database_port: Optional[int] = None
    database_name: Optional[str] = None
    database_user: Optional[str] = None
    database_password: Optional[str] = None

    # LM Studio configuration
    lm_studio_base_url: str = "http://host.docker.internal:1234/v1"

    # Storage configuration
    s3_endpoint_url: str = "http://localhost:9000"
    s3_access_key: str = "minioadmin"
    s3_secret_key: str = "minioadmin"
    s3_bucket_name: str = "slack-ai-outputs"

    # Database configuration
    database_url: str = "sqlite:///./test.db"
    database_host: str = "localhost"
    database_port: int = 5432
    database_name: str = "slack_ai"
    database_user: str = "postgres"
    database_password: str = "password"

    # Application settings
    debug: bool = False
    log_level: str = "INFO"

    # Web3 / blockchain configuration
    coingecko_api_base: str = "https://api.coingecko.com/api/v3"
    coingecko_api_key: Optional[str] = None
    etherscan_api_key: Optional[str] = None
    etherscan_api_base: str = "https://api.etherscan.io/api"
    default_chain: str = "ethereum"

    # EVM RPC endpoints (Alchemy/Infura/public), keyed by chain name
    eth_rpc_url: str = "https://eth.llamarpc.com"
    polygon_rpc_url: str = "https://polygon-rpc.com"
    base_rpc_url: str = "https://mainnet.base.org"
    arbitrum_rpc_url: str = "https://arb1.arbitrum.io/rpc"
    bsc_rpc_url: str = "https://bsc-dataseed.binance.org"

    class Config:
        env_file = ".env"
        case_sensitive = False

    @property
    def chain_rpc_urls(self) -> Dict[str, str]:
        """Map of supported chain name to RPC endpoint URL"""
        return {
            "ethereum": self.eth_rpc_url,
            "polygon": self.polygon_rpc_url,
            "base": self.base_rpc_url,
            "arbitrum": self.arbitrum_rpc_url,
            "bsc": self.bsc_rpc_url,
        }


# Global settings instance
settings = Settings()
