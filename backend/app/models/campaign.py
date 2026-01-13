from sqlalchemy import Column, String, DateTime, ForeignKey, Text, Integer, UniqueConstraint
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Campaign(Base):
    __tablename__ = "campaigns"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Foreign Key: Link to User
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    user = relationship("User", back_populates="campaigns")
    
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    
    # Relationships
    campaign_leads = relationship("CampaignLead", back_populates="campaign")
    chat_sessions = relationship("ChatSession", back_populates="campaign")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class CampaignLead(Base):
    """Bridge table for Leads and Campaigns, holding outreach data."""
    __tablename__ = "campaign_leads"
    
    id = Column(Integer, primary_key=True)
    
    # Composite Primary Key for uniqueness (Lead + Campaign)
    campaign_id = Column(String, ForeignKey("campaigns.id"), nullable=False)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=False)
    
    campaign = relationship("Campaign", back_populates="campaign_leads")
    lead = relationship("Lead", back_populates="campaign_leads")
    
    # Outreach Specifics
    contact_address = Column(String) # The specific contact point used (email or social handle)
    generated_email = Column(Text)   # The content of the generated email
    outreach_status = Column(String, default="Pending") # E.g., 'Sent', 'Opened', 'Replied'
    
    generated_at = Column(DateTime(timezone=True), server_default=func.now())

    # Ensure a lead appears only once per campaign
    __table_args__ = (UniqueConstraint('campaign_id', 'lead_id', name='_campaign_lead_uc'),)
