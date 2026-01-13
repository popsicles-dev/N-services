from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class ChatSession(Base):
    __tablename__ = "chat_sessions"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Keys to User and Campaign
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False) # CRITICAL: Links chat to a specific campaign
    
    user = relationship("User", back_populates="chat_sessions")
    campaign = relationship("Campaign", back_populates="chat_sessions")
    
    messages = relationship(
        "ChatMessage", 
        back_populates="session", 
        order_by="ChatMessage.timestamp", 
        cascade="all, delete-orphan"
    )
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class ChatMessage(Base):
    __tablename__ = "chat_messages"
    
    id = Column(Integer, primary_key=True) 
    session_id = Column(String, ForeignKey("chat_sessions.id"), nullable=False)
    
    question = Column(Text, nullable=False)
    answer = Column(Text, nullable=False)
    
    session = relationship("ChatSession", back_populates="messages")
    
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
