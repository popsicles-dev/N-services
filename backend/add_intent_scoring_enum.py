"""
Script to add INTENT_SCORING to the jobtype enum in PostgreSQL.
Run this script once to update the database schema.
"""
from sqlalchemy import create_engine, text
from config import settings

def add_intent_scoring_enum():
    """Add 'intent_scoring' to the jobtype enum in PostgreSQL."""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Check if the value already exists
        result = conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
            AND enumlabel = 'intent_scoring'
        """))
        
        if result.fetchone():
            print("✓ 'intent_scoring' already exists in jobtype enum")
            return
        
        # Add the new enum value
        try:
            conn.execute(text("""
                ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'intent_scoring'
            """))
            conn.commit()
            print("✓ Successfully added 'intent_scoring' to jobtype enum")
        except Exception as e:
            print(f"✗ Error adding enum value: {e}")
            # Alternative method if ALTER TYPE doesn't work
            print("Trying alternative method...")
            try:
                conn.execute(text("""
                    ALTER TYPE jobtype ADD VALUE 'intent_scoring'
                """))
                conn.commit()
                print("✓ Successfully added 'intent_scoring' to jobtype enum (alternative method)")
            except Exception as e2:
                print(f"✗ Alternative method also failed: {e2}")
                raise

if __name__ == "__main__":
    print("Adding 'intent_scoring' to jobtype enum...")
    add_intent_scoring_enum()
    print("\nDone! You can now use Intent Scoring feature.")
