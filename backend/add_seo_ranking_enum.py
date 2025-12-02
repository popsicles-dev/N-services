"""
Database migration to add SEO_RANKING job type

Run this script to add the new SEO_RANKING enum value to the database.
"""

try:
    import psycopg2
except ImportError:
    # psycopg2-binary is installed, it provides psycopg2
    import sys
    print("Error: psycopg2 module not found in current Python environment")
    print(f"Current Python: {sys.executable}")
    print("\nPlease activate your virtual environment first:")
    print("  .\\venv\\Scripts\\activate")
    print("\nOr run with the venv Python directly:")
    print("  .\\venv\\Scripts\\python.exe add_seo_ranking_enum.py")
    sys.exit(1)

from config import settings

def add_seo_ranking_enum():
    """Add SEO_RANKING to the jobtype enum in PostgreSQL."""
    try:
        # Connect to database
        conn = psycopg2.connect(settings.DATABASE_URL.replace('postgresql://', 'postgresql://').replace('postgresql+psycopg2://', 'postgresql://'))
        cur = conn.cursor()
        
        # Add new enum value if it doesn't exist
        cur.execute("""
            DO $$
            BEGIN
                IF NOT EXISTS (
                    SELECT 1 FROM pg_enum 
                    WHERE enumlabel = 'seo_ranking' 
                    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
                ) THEN
                    ALTER TYPE jobtype ADD VALUE 'seo_ranking';
                END IF;
            END
            $$;
        """)
        
        conn.commit()
        print("✓ Successfully added 'seo_ranking' to jobtype enum")
        
        cur.close()
        conn.close()
        
    except Exception as e:
        print(f"✗ Error: {e}")
        print("\nAlternative: Run this SQL directly in your PostgreSQL database:")
        print("ALTER TYPE jobtype ADD VALUE IF NOT EXISTS 'seo_ranking';")

if __name__ == "__main__":
    add_seo_ranking_enum()
