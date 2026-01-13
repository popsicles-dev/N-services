from app.database import SessionLocal
from app.models.user import User
from app.services.auth_service import auth_service

try:
    db = SessionLocal()
    user = db.query(User).filter(User.email == 'hifsashafique8@gmail.com').first()
    
    if user:
        print(f"Resetting password for {user.email}...")
        user.hashed_password = auth_service.hash_password('password123')
        db.commit()
        print("PASSWORD_RESET_SUCCESS")
    else:
        print("USER_NOT_FOUND")
    
    db.close()
except Exception as e:
    print(f"ERROR: {e}")
