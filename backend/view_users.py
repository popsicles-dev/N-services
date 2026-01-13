"""
Simple script to view all users in the database
"""
from sqlalchemy import create_engine, text
from config import settings

# Create database connection
engine = create_engine(settings.DATABASE_URL)

# Query users
with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT id, email, username, is_active, created_at 
        FROM users 
        ORDER BY created_at DESC
    """))
    
    users = result.fetchall()
    
    if not users:
        print("No users found in the database.")
    else:
        print(f"\n{'='*100}")
        print(f"Total Users: {len(users)}")
        print(f"{'='*100}\n")
        
        # Print header
        print(f"{'ID':<40} {'Email':<30} {'Username':<20} {'Active':<10} {'Created At':<25}")
        print(f"{'-'*40} {'-'*30} {'-'*20} {'-'*10} {'-'*25}")
        
        # Print each user
        for user in users:
            user_id, email, username, is_active, created_at = user
            active_str = "✓ Yes" if is_active else "✗ No"
            created_str = created_at.strftime("%Y-%m-%d %H:%M:%S") if created_at else "N/A"
            
            print(f"{user_id:<40} {email:<30} {username:<20} {active_str:<10} {created_str:<25}")
        
        print(f"\n{'='*100}\n")
