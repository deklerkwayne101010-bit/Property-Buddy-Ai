-- Property Folders System - Inspection & Setup
-- First, let's see what exists in your database

-- Check existing tables
SELECT
  schemaname,
  tablename,
  tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('properties', 'property_images', 'users', 'auth.users');

-- Check properties table structure
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'properties'
ORDER BY ordinal_position;

-- Check property_images table structure (if exists)
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'property_images'
ORDER BY ordinal_position;

-- Check existing constraints on properties
SELECT
  conname,
  contype,
  conkey,
  confkey,
  conrelid::regclass,
  confrelid::regclass
FROM pg_constraint
WHERE conrelid = 'properties'::regclass;

-- Check existing indexes
SELECT
  indexname,
  tablename,
  indexdef
FROM pg_indexes
WHERE tablename IN ('properties', 'property_images')
AND schemaname = 'public';