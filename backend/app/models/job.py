from sqlalchemy import Column, String, Integer, DateTime, Text, Enum
from sqlalchemy.sql import func
from app.database import Base
import enum


class JobType(str, enum.Enum):
    """Types of jobs that can be processed."""
    URL_EXTRACTION = "url_extraction"
    CONTACT_ENRICHMENT = "contact_enrichment"
    SEO_AUDIT = "seo_audit"
    SEO_RANKING = "seo_ranking"



class JobStatus(str, enum.Enum):
    """Status of a job."""
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Job(Base):
    """Database model for tracking background jobs."""
    
    __tablename__ = "jobs"
    
    id = Column(String, primary_key=True, index=True)
    job_type = Column(Enum(JobType), nullable=False)
    status = Column(Enum(JobStatus), default=JobStatus.PENDING, nullable=False)
    
    # Input parameters (stored as JSON string)
    input_params = Column(Text, nullable=True)
    
    # Results
    result_file = Column(String, nullable=True)
    total_items = Column(Integer, default=0)
    processed_items = Column(Integer, default=0)
    
    # Error tracking
    error_message = Column(Text, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    completed_at = Column(DateTime(timezone=True), nullable=True)
    
    def __repr__(self):
        return f"<Job {self.id} - {self.job_type} - {self.status}>"
