-- Verify jobtype enum values in PostgreSQL
-- Run this in pgAdmin Query Tool

SELECT enumlabel 
FROM pg_enum 
WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'jobtype')
ORDER BY enumsortorder;
