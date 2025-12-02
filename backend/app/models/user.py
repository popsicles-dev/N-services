from sqlalchemy import Column, String, DateTime, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    # Primary ID (UUID is recommended for modern web applications)
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    
    # Store the hashed password (NEVER plain text)
    hashed_password = Column(String, nullable=False)
    
    # Subscription/Access Level (e.g., 'seo_starter', 'omnichannel', 'b2b')
    # Use a simple string for now, could be an Enum later.
    subscription_level = Column(String, default="seo_starter") 
    is_active = Column(Boolean, default=True)
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships: One User has many Campaigns, ChatSessions
    campaigns = relationship("Campaign", back_populates="user")
    chat_sessions = relationship("ChatSession", back_populates="user")
