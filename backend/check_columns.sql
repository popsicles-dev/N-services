-- Check the actual column type in the jobs table
-- Run this in pgAdmin Query Tool

SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'jobs';
