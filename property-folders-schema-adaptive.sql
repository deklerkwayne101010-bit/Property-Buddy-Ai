-- Property Folders System - Adaptive Schema
-- This version adapts to your existing table structure

-- First, let's add missing columns to properties table if needed
DO $$
DECLARE
  column_exists BOOLEAN;
BEGIN
  -- Check if 'name' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'name'
  ) INTO column_exists;

  IF NOT column_exists THEN
    ALTER TABLE properties ADD COLUMN name VARCHAR(255);
    RAISE NOTICE 'Added name column to properties table';
  END IF;

  -- Check if 'agent_id' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'agent_id'
  ) INTO column_exists;

  IF NOT column_exists THEN
    ALTER TABLE properties ADD COLUMN agent_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added agent_id column to properties table';
  END IF;

  -- Check if 'created_at' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'created_at'
  ) INTO column_exists;

  IF NOT column_exists THEN
    ALTER TABLE properties ADD COLUMN created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added created_at column to properties table';
  END IF;

  -- Check if 'updated_at' column exists
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'properties'
    AND column_name = 'updated_at'
  ) INTO column_exists;

  IF NOT column_exists THEN
    ALTER TABLE properties ADD COLUMN updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    RAISE NOTICE 'Added updated_at column to properties table';
  END IF;
END $$;

-- Create property_images table if it doesn't exist
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  -- Add foreign key constraint if it doesn't exist
  CONSTRAINT fk_property_images_property_id
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE
);

-- Add foreign key to existing property_images if it exists but doesn't have the constraint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'property_images'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_schema = 'public'
    AND table_name = 'property_images'
    AND constraint_name = 'fk_property_images_property_id'
  ) THEN
    ALTER TABLE property_images
    ADD CONSTRAINT fk_property_images_property_id
    FOREIGN KEY (property_id) REFERENCES properties(id) ON DELETE CASCADE;
    RAISE NOTICE 'Added foreign key constraint to property_images';
  END IF;
END $$;

-- Create indexes if they don't exist
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_uploaded_at ON property_images(uploaded_at DESC);

-- Add unique constraint on properties name+agent_id if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_name_agent_id_key'
  ) THEN
    ALTER TABLE properties ADD CONSTRAINT properties_name_agent_id_key UNIQUE(name, agent_id);
    RAISE NOTICE 'Added unique constraint on properties(name, agent_id)';
  END IF;
END $$;

-- Enable RLS
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
DROP POLICY IF EXISTS "Users can view images from their properties" ON property_images;
DROP POLICY IF EXISTS "Users can upload images to their properties" ON property_images;
DROP POLICY IF EXISTS "Users can delete images from their properties" ON property_images;

-- Create policies
CREATE POLICY "Users can view their own properties" ON properties
  FOR SELECT USING (auth.uid() = agent_id);

CREATE POLICY "Users can create their own properties" ON properties
  FOR INSERT WITH CHECK (auth.uid() = agent_id);

CREATE POLICY "Users can update their own properties" ON properties
  FOR UPDATE USING (auth.uid() = agent_id);

CREATE POLICY "Users can delete their own properties" ON properties
  FOR DELETE USING (auth.uid() = agent_id);

CREATE POLICY "Users can view images from their properties" ON property_images
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
      AND properties.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can upload images to their properties" ON property_images
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
      AND properties.agent_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete images from their properties" ON property_images
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM properties
      WHERE properties.id = property_images.property_id
      AND properties.agent_id = auth.uid()
    )
  );

-- Create update function and trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Property Folders System - Adaptive schema applied successfully!';
  RAISE NOTICE 'Adapted to existing table structure';
  RAISE NOTICE 'Added missing columns and constraints as needed';
  RAISE NOTICE 'RLS policies and triggers configured';
END $$;