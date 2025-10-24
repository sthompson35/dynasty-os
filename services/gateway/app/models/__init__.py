"""
Database models for the Slack AI Gateway
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, JSON, Boolean
from sqlalchemy.sql import func
from ..core.database import Base


class Job(Base):
    """Model for tracking AI/3D rendering jobs"""
    __tablename__ = "jobs"

    id = Column(String(50), primary_key=True, index=True)
    job_type = Column(String(50), nullable=False)  # 'analysis', 'generation', 'render', 'modify'
    status = Column(String(20), nullable=False, default="pending")  # 'pending', 'processing', 'completed', 'failed'
    slack_user_id = Column(String(50), nullable=False)
    slack_channel_id = Column(String(50), nullable=False)
    parameters = Column(JSON, nullable=True)
    result = Column(JSON, nullable=True)
    error_message = Column(Text, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)


class SlackMessage(Base):
    """Model for storing Slack message history"""
    __tablename__ = "slack_messages"

    id = Column(String(50), primary_key=True, index=True)
    slack_message_id = Column(String(50), nullable=False)
    channel_id = Column(String(50), nullable=False)
    user_id = Column(String(50), nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String(20), nullable=False)  # 'command', 'mention', 'message'
    job_id = Column(String(50), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
