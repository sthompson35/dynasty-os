#!/usr/bin/env python3
"""
Create database tables for Slack AI Gateway
"""
import pymssql

def create_tables():
    """Create the jobs and slack_messages tables"""
    try:
        conn = pymssql.connect(
            server='localhost',
            port=1434,
            user='sa',
            password='YourStrong!Passw0rd',
            database='slack_ai'
        )

        cursor = conn.cursor()

        # Create jobs table
        print("📋 Creating jobs table...")
        cursor.execute("""
            CREATE TABLE jobs (
                id VARCHAR(50) PRIMARY KEY,
                job_type VARCHAR(50) NOT NULL,
                status VARCHAR(20) NOT NULL DEFAULT 'pending',
                slack_user_id VARCHAR(50) NOT NULL,
                slack_channel_id VARCHAR(50) NOT NULL,
                parameters NVARCHAR(MAX),
                result NVARCHAR(MAX),
                error_message NTEXT,
                created_at DATETIME2 DEFAULT GETDATE(),
                updated_at DATETIME2,
                completed_at DATETIME2
            )
        """)

        # Create slack_messages table
        print("💬 Creating slack_messages table...")
        cursor.execute("""
            CREATE TABLE slack_messages (
                id VARCHAR(50) PRIMARY KEY,
                slack_message_id VARCHAR(50) NOT NULL,
                channel_id VARCHAR(50) NOT NULL,
                user_id VARCHAR(50) NOT NULL,
                message_text NTEXT NOT NULL,
                message_type VARCHAR(20) NOT NULL,
                job_id VARCHAR(50),
                created_at DATETIME2 DEFAULT GETDATE()
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
