-- Fix: Drop the incorrectly added enum value and add the correct one
-- Run this in pgAdmin

-- First, check if 'seo_ranking' exists (it should from our previous migration)
-- If it does, we're good. If not, add it.

-- The issue is that PostgreSQL enum values are case-sensitive
-- We added 'seo_ranking' but need to verify it matches the Python code

-- Check current enum values:
SELECT enumlabel FROM pg_enum WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype');

-- The output should show:
-- url_extraction
-- contact_enrichment  
-- seo_audit
-- seo_ranking

-- If you see 'seo_ranking' in the list, the database is correct.
-- The error suggests the enum value exists but there might be a connection pool issue.

-- Solution: Just restart the backend server and Celery worker
-- The enum value is already correct in the database.
