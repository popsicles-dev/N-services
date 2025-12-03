from sqlalchemy import create_engine, text
from config import settings
import sys

try:
    engine = create_engine(settings.DATABASE_URL)
    with engine.connect() as conn:
        result = conn.execute(text("SELECT email, is_active FROM users WHERE email = 'hifsashafique8@gmail.com'"))
        user = result.fetchone()
        if user:
            print(f"USER_FOUND: {user[0]}, Active: {user[1]}")
        else:
            print("USER_NOT_FOUND")
except Exception as e:
    print(f"ERROR: {e}")
