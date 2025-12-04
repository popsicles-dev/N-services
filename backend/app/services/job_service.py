from sqlalchemy.orm import Session
from app.models import Job, JobType, JobStatus
from typing import Optional, Dict, Any
import uuid
import json
from datetime import datetime

class JobService:
    """Service for managing background jobs."""

    def __init__(self, db: Session):
        """Initialize the Job service.
        
        Args:
            db: Database session
        """
        self.db = db

    def create_job(self, job_type: JobType, input_params: Dict[str, Any]) -> Job:
        """Create a new job record.
        
        Args:
            job_type: Type of job (URL_EXTRACTION, CONTACT_ENRICHMENT, STRUCTURAL_AUDIT, LEAD_SCORING)
            input_params: Dictionary of input parameters
            
        Returns:
            Created Job instance
        """
        job_id = str(uuid.uuid4())
        job = Job(
            id=job_id,
            job_type=job_type,
            status=JobStatus.PENDING,
            input_params=json.dumps(input_params, sort_keys=True)
        )
        self.db.add(job)
        self.db.commit()
        self.db.refresh(job)
        return job

    def find_existing_job(self, job_type: JobType, input_params: Dict[str, Any]) -> Optional[Job]:
        """Find a completed job with matching parameters.
        
        Args:
            job_type: Type of job
            input_params: Dictionary of input parameters
            
        Returns:
            Job instance if found, else None
        """
        from config import settings
        import os

        params_json = json.dumps(input_params, sort_keys=True)
        jobs = self.db.query(Job).filter(
            Job.job_type == job_type,
            Job.input_params == params_json,
            Job.status == JobStatus.COMPLETED
        ).order_by(Job.created_at.desc()).all()

        for job in jobs:
            # Check if job has results
            if not job.result_file or (job.total_items is not None and job.total_items == 0):
                continue
                
            # Check if file exists
            filepath = f"{settings.OUTPUT_DIR}/{job.result_file}"
            if os.path.exists(filepath):
                return job
                
        return None

    def get_job(self, job_id: str) -> Optional[Job]:
        """Retrieve a job by ID.
        
        Args:
            job_id: ID of the job to retrieve
            
        Returns:
            Job instance or None if not found
        """
        return self.db.query(Job).filter(Job.id == job_id).first()

    def update_job_status(self, job_id: str, status: JobStatus, result_file: Optional[str] = None, error_message: Optional[str] = None):
        """Update job status and results.
        
        Args:
            job_id: ID of the job to update
            status: New status
            result_file: Optional result filename
            error_message: Optional error message
        """
        job = self.get_job(job_id)
        if job:
            job.status = status
            if result_file:
                job.result_file = result_file
            if error_message:
                job.error_message = error_message
            if status in [JobStatus.COMPLETED, JobStatus.FAILED]:
                job.completed_at = datetime.utcnow()
            
            self.db.commit()
            self.db.refresh(job)
            return job
        return None
