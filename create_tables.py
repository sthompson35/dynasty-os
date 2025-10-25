#!/usr/bin/env python3
"""
Create database tables for Slack AI Gateway
"""
import sqlite3
import os

def create_tables():
    """Create the jobs and slack_messages tables"""
    try:
        # Create database file if it doesn't exist
        db_path = os.path.join(os.path.dirname(__file__), 'test.db')
        conn = sqlite3.connect(db_path)

        cursor = conn.cursor()

        # Create jobs table
        print("📋 Creating jobs table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS jobs (
                id VARCHAR(50) PRIMARY KEY,
                job_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                slack_user_id VARCHAR(50) NOT NULL,
                slack_channel_id VARCHAR(50) NOT NULL,
                parameters TEXT,
                result TEXT,
                error_message TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME,
                completed_at DATETIME
            )
        """)

        # Create slack_messages table
        print("💬 Creating slack_messages table...")
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS slack_messages (
                id VARCHAR(50) PRIMARY KEY,
                slack_message_id VARCHAR(50) NOT NULL,
                channel_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                message_text TEXT NOT NULL,
                message_type VARCHAR(20) NOT NULL,
                job_id VARCHAR(50),
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        """)

        conn.commit()
        print("✅ Tables created successfully!")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Error creating tables: {e}")

if __name__ == "__main__":
    create_tables()
