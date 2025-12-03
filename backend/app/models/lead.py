from sqlalchemy.dialects.postgresql import JSON
from sqlalchemy import Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid
from app.database import Base

class Lead(Base):
    __tablename__ = "leads"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()), index=True)
    
    # Core Extracted Data
    business_name = Column(String, nullable=False)
    website_url = Column(String, unique=True, nullable=False, index=True)
    
    # Contact Information (Enriched Data)
    email = Column(String, nullable=True)
    phone_number = Column(String, nullable=True)
    
    # Store social media links as a JSON object (flexible schema)
    # e.g., {'Facebook': 'url', 'LinkedIn': 'url'}
    social_media = Column(JSON, nullable=True)
    # LLM Lead Score (Intent_Score) - Qualitative LLM judgment
    intent_score = Column(String, nullable=True) 
    
    # Timestamp: When the lead was originally created/extracted
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relationship: One Lead has one AuditResult, One Lead can be in many Campaigns
    audit_result = relationship("LeadAudit", back_populates="lead", uselist=False)
    campaign_leads = relationship("CampaignLead", back_populates="lead")

class LeadAudit(Base):
    __tablename__ = "lead_audits"
    
    id = Column(String, primary_key=True, default=lambda: str(uuid.uuid4()))
    
    # Foreign Key: One-to-One relationship with Lead
    lead_id = Column(String, ForeignKey("leads.id"), unique=True, nullable=False)
    lead = relationship("Lead", back_populates="audit_result")
    
    # Core Structural Insights (for presentation and scoring)
    title_tag = Column(Text)
    meta_description = Column(Text)
    h1_content = Column(Text)
    
    # Store raw audit data (e.g., status, errors, timestamps) as JSON
    raw_audit_data = Column(JSON) 
    
    # Timestamp: When the audit was performed
    audited_at = Column(DateTime(timezone=True), server_default=func.now())
