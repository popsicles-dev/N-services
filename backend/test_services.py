import sys
import os

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'app'))

try:
    from app.services import StructuralAuditService, LeadScoringService
    print("Services imported successfully")
    
    audit = StructuralAuditService()
    print("StructuralAuditService instantiated")
    
    score = LeadScoringService()
    print("LeadScoringService instantiated")
    
except Exception as e:
    print(f"Error: {e}")
    sys.exit(1)
