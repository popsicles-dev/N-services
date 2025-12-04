import sys
import os

# Add backend to path
sys.path.append(os.getcwd())

print("Verifying imports...")

try:
    # 1. Check Celery
    from celery_app import celery_app
    print("✓ Celery app imported")

    # 2. Check Models
    from app.models import Job, JobType, JobStatus
    print("✓ Models imported")

    # 3. Check Services
    from app.services import (
        URLExtractorService,
        ContactEnricherService,
        StructuralAuditService,
        LeadScoringService
    )
    print("✓ Services imported")

    # 4. Check Tasks
    from app.tasks import (
        extract_urls_task,
        enrich_contacts_task,
        structural_audit_task,
        lead_scoring_task
    )
    print("✓ Tasks imported")

    # 5. Check Routers
    from app.routers import leads
    print("✓ Routers imported")

    # 6. Instantiate Services (sanity check)
    audit = StructuralAuditService()
    score = LeadScoringService()
    print("✓ Services instantiated")

    print("\nALL CHECKS PASSED")

except Exception as e:
    print(f"\n❌ VERIFICATION FAILED: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
