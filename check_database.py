#!/usr/bin/env python3
"""
Check database contents for Slack AI Gateway
"""
import pymssql

def check_database():
    """Check the database for jobs and slack messages"""
    try:
        conn = pymssql.connect(
            server='localhost',
            port=1434,
            user='sa',
            password='YourStrong!Passw0rd',
            database='slack_ai'
        )

        cursor = conn.cursor()

        # Check alembic version
        print("🔍 Checking alembic version:")
        try:
            cursor.execute("SELECT version_num FROM alembic_version")
            version = cursor.fetchone()
            if version:
                print(f"  Current alembic version: {version[0]}")
            else:
                print("  No alembic version found")
        except:
            print("  alembic_version table not found")

        # Check jobs table
        print("\n📋 Jobs in database:")
        try:
            cursor.execute("SELECT id, job_type, status, created_at FROM jobs ORDER BY created_at DESC")
            jobs = cursor.fetchall()

            if jobs:
                for job in jobs:
                    print(f"  ID: {job[0]}, Type: {job[1]}, Status: {job[2]}, Created: {job[3]}")
            else:
                print("  No jobs found")
        except Exception as e:
            print(f"  Error querying jobs: {e}")

        # Check slack_messages table
        print("\n💬 Slack messages in database:")
        try:
            cursor.execute("SELECT id, message_type, user_id, created_at FROM slack_messages ORDER BY created_at DESC")
            messages = cursor.fetchall()

            if messages:
                for msg in messages:
                    print(f"  ID: {msg[0]}, Type: {msg[1]}, User: {msg[2]}, Created: {msg[3]}")
            else:
                print("  No slack messages found")
        except Exception as e:
            print(f"  Error querying messages: {e}")

        cursor.close()
        conn.close()

    except Exception as e:
        print(f"❌ Database error: {e}")

if __name__ == "__main__":
    check_database()
