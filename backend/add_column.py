from sqlalchemy import create_engine, text
from config import settings

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        conn.execute(text("ALTER TABLE users ADD COLUMN subscription_level VARCHAR DEFAULT 'seo_starter'"))
        conn.commit()
        print("COLUMN_ADDED")
except Exception as e:
    print(f"ERROR: {e}")
