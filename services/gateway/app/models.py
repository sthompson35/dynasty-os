"""
Database models for the Slack AI Gateway
"""

from sqlalchemy import Column, Integer, String, DateTime, Text, Boolean, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime

Base = declarative_base()

class Job(Base):
    __tablename__ = "jobs"

    id = Column(String, primary_key=True, index=True)
    job_type = Column(String, nullable=False)  # "render" or "analyze"
    status = Column(String, default="pending")  # "pending", "running", "completed", "failed"
    slack_user_id = Column(String, nullable=False)
    slack_channel_id = Column(String, nullable=False)
    parameters = Column(Text)  # JSON string of parameters
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

class SlackMessage(Base):
    __tablename__ = "slack_messages"

    id = Column(String, primary_key=True, index=True)
    slack_message_id = Column(String, unique=True, nullable=False)
    channel_id = Column(String, nullable=False)
    user_id = Column(String, nullable=False)
    message_text = Column(Text, nullable=False)
    message_type = Column(String, default="message")  # "command", "message", etc.
    created_at = Column(DateTime, default=datetime.utcnow)
