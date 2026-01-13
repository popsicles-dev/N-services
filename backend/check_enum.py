"""Check what enum values exist in the database."""
from sqlalchemy import create_engine, text
from config import settings

engine = create_engine(settings.DATABASE_URL)
conn = engine.connect()

result = conn.execute(text("""
    SELECT enumlabel 
    FROM pg_enum 
    WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
    ORDER BY enumsortorder
"""))

print("Existing jobtype enum values in PostgreSQL:")
for row in result:
    print(f"  - '{row[0]}'")

conn.close()
