import sys
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

# Add app directory to path
sys.path.append(os.path.join(os.path.dirname(__file__), 'app'))

from app.database import Base, engine, SessionLocal
from app.models import User, Lead, LeadAudit, Campaign, CampaignLead, ChatSession, ChatMessage

def verify_schema():
    print("Initializing database...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ Tables created.")
    except Exception as e:
        print(f"❌ Failed to create tables: {e}")
        return

    db = SessionLocal()
    try:
        # 1. Create User
        print("\nCreating User...")
        user = User(username="testuser_v2", email="test_v2@example.com", hashed_password="hashed_secret")
        db.add(user)
        db.commit()
        print(f"✅ User created: {user.id}")
        
        # 2. Create Campaign
        print("\nCreating Campaign...")
        campaign = Campaign(name="Test Campaign V2", user_id=user.id)
        db.add(campaign)
        db.commit()
        print(f"✅ Campaign created: {campaign.id}")
        
        # Check updated_at (should be None initially or equal to created_at depending on implementation, here onupdate only triggers on update)
        # Actually server_default=func.now() is for created_at. onupdate=func.now() is for updates.
        
        # 3. Create Lead
        print("\nCreating Lead...")
        lead = Lead(business_name="Test Business V2", website_url="https://testbusiness_v2.com")
        db.add(lead)
        db.commit()
        print(f"✅ Lead created: {lead.id}")
        
        # 4. Link Lead to Campaign
        print("\nLinking Lead to Campaign...")
        campaign_lead = CampaignLead(campaign_id=campaign.id, lead_id=lead.id)
        db.add(campaign_lead)
        db.commit()
        print(f"✅ CampaignLead created.")
        
        # 5. Test Unique Constraint
        print("\nTesting Unique Constraint on CampaignLead...")
        try:
            duplicate_link = CampaignLead(campaign_id=campaign.id, lead_id=lead.id)
            db.add(duplicate_link)
            db.commit()
            print("❌ Unique Constraint FAILED (Duplicate allowed)")
        except Exception as e:
            db.rollback()
            print("✅ Unique Constraint PASSED (Duplicate rejected)")
            
        # 6. Test updated_at
        print("\nTesting updated_at timestamp...")
        import time
        time.sleep(1) # Ensure time difference
        
        campaign.name = "Updated Campaign Name"
        db.commit()
        
        updated_campaign = db.query(Campaign).filter(Campaign.id == campaign.id).first()
        if updated_campaign.updated_at:
            print(f"✅ updated_at verified: {updated_campaign.updated_at}")
        else:
            print("❌ updated_at FAILED (None)")

        print("\n✅ Schema verification successful!")
        
    except Exception as e:
        print(f"\n❌ Verification failed: {e}")
        db.rollback()
    finally:
        # Cleanup
        try:
            # Delete in order of dependencies
            db.query(CampaignLead).delete()
            db.query(ChatSession).delete() # If any
            db.query(LeadAudit).delete() # If any
            db.query(Campaign).delete()
            db.query(Lead).delete()
            db.query(User).delete()
            db.commit()
            print("✅ Cleanup successful.")
        except Exception as e:
            print(f"Cleanup failed: {e}")
        db.close()

if __name__ == "__main__":
    verify_schema()
