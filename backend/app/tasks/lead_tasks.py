from celery import Task
from celery_app import celery_app
from app.services import URLExtractorService, ContactEnricherService
from app.database import SessionLocal
from app.models import Job, JobStatus
from sqlalchemy.sql import func
import json


class DatabaseTask(Task):
    """Base task class that provides database session."""
    
    def __call__(self, *args, **kwargs):
        """Execute task with database session."""
        return super().__call__(*args, **kwargs)


@celery_app.task(bind=True, base=DatabaseTask)
def extract_urls_task(self, job_id: str, business_type: str, location: str, num_pages: int):
    """Celery task for extracting URLs from Google Maps.
    
    Args:
        job_id: Database job ID
        business_type: Type of business to search for
        location: Location to search in
        num_pages: Number of pages to scrape
    """
    db = SessionLocal()
    
    try:
        # Update job status to processing
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = JobStatus.PROCESSING
        db.commit()
        
        # Progress callback
        def update_progress(current_page, total_pages):
            job.processed_items = current_page
            job.total_items = total_pages
            db.commit()
        
        # Extract URLs
        extractor = URLExtractorService()
        results = extractor.extract_urls(
            business_type=business_type,
            location=location,
            num_pages=num_pages,
            progress_callback=update_progress
        )
        
        # Save to CSV
        if results['results']:
            filename = extractor.save_to_csv(results['results'], results['query'])
            
            # Update job with results
            job.status = JobStatus.COMPLETED
            job.result_file = filename
            job.total_items = results['total_found']
            job.processed_items = results['total_found']
            job.completed_at = func.now()
            db.commit()
            
            return {
                'status': 'completed',
                'filename': filename,
                'total_found': results['total_found'],
                'with_websites': results['with_websites']
            }
        else:
            job.status = JobStatus.COMPLETED
            job.error_message = "No businesses with websites found"
            job.completed_at = func.now()
            db.commit()
            
            return {
                'status': 'completed',
                'message': 'No results found'
            }
            
    except Exception as e:
        # Update job status to failed
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = func.now()
            db.commit()
        
        raise e
        
    finally:
        db.close()


@celery_app.task(bind=True, base=DatabaseTask)
def enrich_contacts_task(self, job_id: str, input_filename: str):
    """Celery task for enriching contacts from CSV.
    
    Args:
        job_id: Database job ID
        input_filename: Name of input CSV file
    """
    db = SessionLocal()
    
    try:
        # Update job status to processing
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = JobStatus.PROCESSING
        db.commit()
        
        # Progress callback
        def update_progress(current_item, total_items):
            job.processed_items = current_item
            job.total_items = total_items
            db.commit()
        
        # Enrich contacts
        enricher = ContactEnricherService()
        results = enricher.enrich_contacts(
            input_filename=input_filename,
            progress_callback=update_progress
        )
        
        # Update job with results
        job.status = JobStatus.COMPLETED
        job.result_file = results['output_filename']
        job.total_items = results['total_processed']
        job.processed_items = results['total_processed']
        job.completed_at = func.now()
        db.commit()
        
        return {
            'status': 'completed',
            'filename': results['output_filename'],
            'total_processed': results['total_processed']
        }
        
    except Exception as e:
        # Update job status to failed
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = func.now()
            db.commit()
        
        raise e
        
    finally:
        db.close()


@celery_app.task(bind=True, base=DatabaseTask)
def seo_audit_task(self, job_id: str, input_filename: str, limit: int = 1):
    """Celery task for SEO Audit.
    
    Args:
        job_id: Database job ID
        input_filename: Name of input CSV file
        limit: Max websites to audit
    """
    db = SessionLocal()
    
    try:
        # Update job status to processing
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = JobStatus.PROCESSING
        db.commit()
        
        # Progress callback
        def update_progress(current_item, total_items):
            job.processed_items = current_item
            job.total_items = total_items
            db.commit()
        
        # Run Audit
        from app.services.seo_audit import StructuralAuditService
        auditor = StructuralAuditService()
        results = auditor.run_audit(
            input_filename=input_filename,
            limit=limit,
            progress_callback=update_progress
        )
        
        # Update job with results
        job.status = JobStatus.COMPLETED
        job.result_file = results['output_filename']
        job.total_items = results['total_processed']
        job.processed_items = results['total_processed']
        job.completed_at = func.now()
        db.commit()
        
        return {
            'status': 'completed',
            'filename': results['output_filename'],
            'total_processed': results['total_processed']
        }
        
    except Exception as e:
        # Update job status to failed
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = func.now()
            db.commit()
        
        raise e
        
    finally:
        db.close()


@celery_app.task(bind=True, base=DatabaseTask)
def seo_ranking_task(self, job_id: str, input_filename: str):
    """Celery task for SEO Ranking.
    
    Args:
        job_id: Database job ID
        input_filename: Name of input CSV file
    """
    db = SessionLocal()
    
    try:
        # Update job status to processing
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            raise ValueError(f"Job {job_id} not found")
        
        job.status = JobStatus.PROCESSING
        db.commit()
        
        # Progress callback
        def update_progress(current_item, total_items):
            job.processed_items = current_item
            job.total_items = total_items
            db.commit()
        
        # Run SEO Ranking
        from app.services.seo_ranking import SeoRankingService
        ranker = SeoRankingService()
        results = ranker.rank_leads(
            input_filename=input_filename,
            progress_callback=update_progress
        )
        
        # Update job with results
        job.status = JobStatus.COMPLETED
        job.result_file = results['output_filename']
        job.total_items = results['total_processed']
        job.processed_items = results['total_processed']
        job.completed_at = func.now()
        db.commit()
        
        return {
            'status': 'completed',
            'filename': results['output_filename'],
            'total_processed': results['total_processed']
        }
        
    except Exception as e:
        # Update job status to failed
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = JobStatus.FAILED
            job.error_message = str(e)
            job.completed_at = func.now()
            db.commit()
        
        raise e
        
    finally:
        db.close()
