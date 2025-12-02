from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from typing import Optional
from app.database import get_db
from app.models import Job, JobType, JobStatus
from app.tasks import extract_urls_task, enrich_contacts_task, seo_ranking_task
import uuid
import json
import os
import shutil
from datetime import datetime
from config import settings
from app.services.job_service import JobService

router = APIRouter()


# --- Request/Response Models ---

class URLExtractionRequest(BaseModel):
    """Request model for URL extraction."""
    business_type: str = Field(..., description="Type of business (e.g., plumber, restaurant)")
    location: str = Field(..., description="Location to search (e.g., Dallas Texas)")
    num_pages: int = Field(1, ge=1, le=10, description="Number of pages to scrape (1-10)")


class ContactEnrichmentRequest(BaseModel):
    """Request model for contact enrichment."""
    input_filename: str = Field(..., description="Name of CSV file to enrich")


class AuditRequest(BaseModel):
    """Request model for SEO audit."""
    input_filename: str = Field(..., description="Name of CSV file to audit")
    limit: int = Field(1, ge=1, description="Number of websites to audit")


class JobResponse(BaseModel):
    """Response model for job creation."""
    job_id: str
    status: str
    message: str


class JobStatusResponse(BaseModel):
    """Response model for job status."""
    job_id: str
    job_type: str
    status: str
    total_items: int
    processed_items: int
    result_file: Optional[str] = None
    error_message: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


# --- API Endpoints ---

@router.post("/extract-urls", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_url_extraction(
    request: URLExtractionRequest,
    db: Session = Depends(get_db)
):
    """Start a background job to extract URLs from Google Maps.
    
    Args:
        request: URL extraction parameters
        db: Database session
        
    Returns:
        Job ID and status
    """
    # Create job record using JobService
    # Check for existing job
    job_service = JobService(db)
    input_params = {
        "business_type": request.business_type,
        "location": request.location,
        "num_pages": request.num_pages
    }
    
    existing_job = job_service.find_existing_job(JobType.URL_EXTRACTION, input_params)
    if existing_job:
        return JobResponse(
            job_id=existing_job.id,
            status="completed",
            message="Returning cached results"
        )

    job = job_service.create_job(
        job_type=JobType.URL_EXTRACTION,
        input_params=input_params
    )
    job_id = job.id
    
    # Start Celery task
    extract_urls_task.delay(
        job_id=job_id,
        business_type=request.business_type,
        location=request.location,
        num_pages=request.num_pages
    )
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        message="URL extraction job started"
    )


@router.post("/enrich-contacts", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_contact_enrichment(
    request: ContactEnrichmentRequest,
    db: Session = Depends(get_db)
):
    """Start a background job to enrich contacts from a CSV file.
    
    Args:
        request: Contact enrichment parameters
        db: Database session
        
    Returns:
        Job ID and status
    """
    # Verify input file exists
    input_filepath = f"{settings.OUTPUT_DIR}/{request.input_filename}"
    if not os.path.exists(input_filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Input file '{request.input_filename}' not found"
        )
    
    # Check for existing job
    job_service = JobService(db)
    input_params = {
        "input_filename": request.input_filename
    }
    
    existing_job = job_service.find_existing_job(JobType.CONTACT_ENRICHMENT, input_params)
    if existing_job:
        return JobResponse(
            job_id=existing_job.id,
            status="completed",
            message="Returning cached results"
        )

    job = job_service.create_job(
        job_type=JobType.CONTACT_ENRICHMENT,
        input_params=input_params
    )
    job_id = job.id
    
    # Start Celery task
    enrich_contacts_task.delay(
        job_id=job_id,
        input_filename=request.input_filename
    )
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        message="Contact enrichment job started"
    )


@router.post("/rank-seo", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_seo_ranking(
    request: ContactEnrichmentRequest,  # Reuse same request model (just needs input_filename)
    db: Session = Depends(get_db)
):
    """Start a background job to rank leads by SEO performance.
    
    Args:
        request: SEO ranking parameters (input_filename)
        db: Database session
        
    Returns:
        Job ID and status
    """
    # Verify input file exists
    input_filepath = f"{settings.OUTPUT_DIR}/{request.input_filename}"
    if not os.path.exists(input_filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Input file '{request.input_filename}' not found"
        )
    
    # Create new job (removed caching check due to JSON comparison issues)
    job_service = JobService(db)
    input_params = {
        "input_filename": request.input_filename
    }

    job = job_service.create_job(
        job_type=JobType.SEO_RANKING,
        input_params=input_params
    )
    job_id = job.id
    
    # Start Celery task
    seo_ranking_task.delay(
        job_id=job_id,
        input_filename=request.input_filename
    )
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        message="SEO ranking job started"
    )



@router.post("/audit/run", response_model=JobResponse, status_code=status.HTTP_202_ACCEPTED)
async def start_seo_audit(
    request: AuditRequest,
    db: Session = Depends(get_db)
):
    """Start a background job to audit websites from a CSV file.
    
    Args:
        request: Audit parameters
        db: Database session
        
    Returns:
        Job ID and status
    """
    # Verify input file exists
    input_filepath = f"{settings.OUTPUT_DIR}/{request.input_filename}"
    if not os.path.exists(input_filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Input file '{request.input_filename}' not found"
        )
    
    # Check for existing job
    job_service = JobService(db)
    input_params = {
        "input_filename": request.input_filename,
        "limit": request.limit
    }
    
    existing_job = job_service.find_existing_job(JobType.SEO_AUDIT, input_params)
    if existing_job:
        return JobResponse(
            job_id=existing_job.id,
            status="completed",
            message="Returning cached results"
        )

    job = job_service.create_job(
        job_type=JobType.SEO_AUDIT,
        input_params=input_params
    )
    job_id = job.id
    
    # Start Celery task
    from app.tasks.lead_tasks import seo_audit_task
    seo_audit_task.delay(
        job_id=job_id,
        input_filename=request.input_filename,
        limit=request.limit
    )
    
    return JobResponse(
        job_id=job_id,
        status="pending",
        message="SEO audit job started"
    )


@router.post("/audit/upload")
async def upload_audit_file(file: UploadFile = File(...)):
    """Upload a CSV file for auditing."""
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Only CSV files are allowed")
    
    filename = f"upload_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{file.filename}"
    filepath = f"{settings.OUTPUT_DIR}/{filename}"
    
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        return {
            "filename": filename,
            "message": "File uploaded successfully"
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to upload file: {str(e)}")


@router.get("/job/{job_id}", response_model=JobStatusResponse)
async def get_job_status(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Get the status of a background job.
    
    Args:
        job_id: Job ID to check
        db: Database session
        
    Returns:
        Job status and details
    """
    job_service = JobService(db)
    job = job_service.get_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found"
        )
    
    return JobStatusResponse(
        job_id=job.id,
        job_type=job.job_type.value,
        status=job.status.value,
        total_items=job.total_items or 0,
        processed_items=job.processed_items or 0,
        result_file=job.result_file,
        error_message=job.error_message,
        created_at=job.created_at.isoformat() if job.created_at else None,
        completed_at=job.completed_at.isoformat() if job.completed_at else None
    )


@router.get("/audit/job/{job_id}", response_model=JobStatusResponse)
async def get_audit_status(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Get the status of an audit job (alias for /job/{job_id})."""
    return await get_job_status(job_id, db)


@router.get("/download/{job_id}")
async def download_result(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Download the result CSV file for a completed job.
    
    Args:
        job_id: Job ID to download results for
        db: Database session
        
    Returns:
        CSV file download
    """
    job_service = JobService(db)
    job = job_service.get_job(job_id)
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Job '{job_id}' not found"
        )
    
    if job.status != JobStatus.COMPLETED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Job is not completed yet. Current status: {job.status.value}"
        )
    
    if not job.result_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No result file available for this job"
        )
    
    filepath = f"{settings.OUTPUT_DIR}/{job.result_file}"
    
    if not os.path.exists(filepath):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Result file not found: {job.result_file}"
        )
    
    return FileResponse(
        path=filepath,
        filename=job.result_file,
        media_type="text/csv"
    )


@router.get("/audit/download/{job_id}")
async def download_audit_result(
    job_id: str,
    db: Session = Depends(get_db)
):
    """Download the result CSV file for a completed audit job (alias)."""
    return await download_result(job_id, db)


@router.get("/list-files")
async def list_output_files():
    """List all CSV files in the output directory.
    
    Returns:
        List of available CSV files
    """
    if not os.path.exists(settings.OUTPUT_DIR):
        return {"files": []}
    
    files = [
        {
            "filename": f,
            "size": os.path.getsize(f"{settings.OUTPUT_DIR}/{f}"),
            "created": datetime.fromtimestamp(os.path.getctime(f"{settings.OUTPUT_DIR}/{f}")).isoformat()
        }
        for f in os.listdir(settings.OUTPUT_DIR)
        if f.endswith('.csv')
    ]
    
    return {"files": files, "count": len(files)}


@router.post("/rank-csv-file")
async def rank_csv_file(file: UploadFile = File(...)):
    """
    Rank an already-audited CSV file using PainScore algorithm.
    No API calls needed - just calculates from existing data.
    """
    from app.services.csv_ranker import CsvRankerService
    
    # Validate file type
    if not file.filename.endswith('.csv'):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only CSV files are allowed"
        )
    
    try:
        # Read file content
        content = await file.read()
        
        # Rank the CSV
        ranker = CsvRankerService()
        result = ranker.rank_csv(content)
        
        if not result['valid']:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=result.get('error', 'Invalid CSV format')
            )
        
        return {
            "success": True,
            "data": result['data'],
            "total_ranked": result['total_ranked']
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error processing CSV: {str(e)}"
        )
