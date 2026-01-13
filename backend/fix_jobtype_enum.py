"""
Fix the jobtype enum in PostgreSQL to use consistent uppercase naming.
This script recreates the enum with proper uppercase values.
"""
from sqlalchemy import create_engine, text
from config import settings

def fix_jobtype_enum():
    """Fix the jobtype enum to use consistent uppercase values."""
    engine = create_engine(settings.DATABASE_URL)
    
    with engine.connect() as conn:
        # Start a transaction
        trans = conn.begin()
        
        try:
            print("Step 1: Checking current enum values...")
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
                ORDER BY enumsortorder
            """))
            current_values = [row[0] for row in result]
            print(f"  Current values: {current_values}")
            
            # Check if we need to fix anything
            needs_fix = any(v.islower() for v in current_values if v not in ['url_extraction', 'contact_enrichment', 'seo_audit'])
            
            if not needs_fix:
                print("✓ Enum values look correct, no fix needed")
                trans.commit()
                return
            
            print("\nStep 2: Creating new enum type with correct values...")
            conn.execute(text("""
                CREATE TYPE jobtype_new AS ENUM (
                    'URL_EXTRACTION', 
                    'CONTACT_ENRICHMENT', 
                    'SEO_AUDIT', 
                    'SEO_RANKING', 
                    'INTENT_SCORING'
                )
            """))
            
            print("Step 3: Converting jobs table to use new enum...")
            # First, convert job_type column to text
            conn.execute(text("""
                ALTER TABLE jobs 
                ALTER COLUMN job_type TYPE VARCHAR(50) USING job_type::text
            """))
            
            print("Step 4: Updating lowercase values to uppercase...")
            conn.execute(text("""
                UPDATE jobs SET job_type = UPPER(job_type)
            """))
            
            print("Step 5: Drop old enum type...")
            conn.execute(text("DROP TYPE jobtype"))
            
            print("Step 6: Rename new enum type...")
            conn.execute(text("ALTER TYPE jobtype_new RENAME TO jobtype"))
            
            print("Step 7: Convert column back to enum type...")
            conn.execute(text("""
                ALTER TABLE jobs 
                ALTER COLUMN job_type TYPE jobtype USING job_type::jobtype
            """))
            
            trans.commit()
            print("\n✓ Successfully fixed jobtype enum!")
            
        except Exception as e:
            trans.rollback()
            print(f"\n✗ Error: {e}")
            print("Transaction rolled back.")
            raise

if __name__ == "__main__":
    print("=" * 60)
    print("Fixing jobtype enum values in PostgreSQL")
    print("=" * 60)
    fix_jobtype_enum()
    
    # Verify the fix
    print("\n" + "=" * 60)
    print("Verifying fix...")
    print("=" * 60)
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("""
            SELECT enumlabel 
            FROM pg_enum 
            WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
            ORDER BY enumsortorder
        """))
        print("New enum values:")
        for row in result:
            print(f"  - '{row[0]}'")
