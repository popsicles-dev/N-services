"""
Simple database migration to add SEO_RANKING job type
Run this with: python migrate_seo_ranking.py
"""

import psycopg2

# Database connection string - update if needed
DATABASE_URL = "postgresql://postgres:postgres@localhost:5432/seo_leads_db"

def add_seo_ranking_enum():
    """Add SEO_RANKING to the jobtype enum in PostgreSQL."""
    try:
        # Connect to database
        conn = psycopg2.connect(DATABASE_URL)
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
        print("\nIf you get a connection error, update the DATABASE_URL in this script")
        print("Or run this SQL directly in pgAdmin:")
        print("ALTER TYPE jobtype ADD VALUE 'seo_ranking';")

if __name__ == "__main__":
    add_seo_ranking_enum()
