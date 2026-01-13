"""
Sync INTENT_SCORING enum value with PostgreSQL database.
Run from within the backend directory with venv activated.

This script connects to the database using the same connection pool
as the main application.
"""
from app.database import engine
from sqlalchemy import text

def add_intent_scoring_enum():
    """Add intent_scoring to the jobtype enum in PostgreSQL."""
    with engine.connect() as connection:
        # First check if enum exists
        result = connection.execute(text("""
            SELECT enumlabel FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
        """))
        existing_values = [row[0] for row in result]
        print(f"Current jobtype enum values: {existing_values}")
        
        if 'intent_scoring' in existing_values:
            print("✓ 'intent_scoring' already exists in jobtype enum")
        else:
            connection.execute(text(
                "ALTER TYPE jobtype ADD VALUE 'intent_scoring'"
            ))
            connection.commit()
            print("✓ Successfully added 'intent_scoring' to jobtype enum!")

if __name__ == "__main__":
    add_intent_scoring_enum()
