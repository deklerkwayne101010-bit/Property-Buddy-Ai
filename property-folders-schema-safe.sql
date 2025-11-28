-- Property Folders System Schema (Safe Version)
-- For organizing real estate images by property
-- This version handles existing tables safely

-- Drop existing tables if they exist (be careful with this!)
-- Uncomment the lines below if you want to completely recreate the tables
-- DROP TABLE IF EXISTS property_images CASCADE;
-- DROP TABLE IF EXISTS properties CASCADE;

-- Create properties table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS properties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  agent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add unique constraint (only if it doesn't exist)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'properties_name_agent_id_key'
  ) THEN
    ALTER TABLE properties ADD CONSTRAINT properties_name_agent_id_key UNIQUE(name, agent_id);
  END IF;
END $$;

-- Create property images table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS property_images (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES properties(id) ON DELETE CASCADE,
  filename VARCHAR(255) NOT NULL,
  original_filename VARCHAR(255) NOT NULL,
  url TEXT NOT NULL,
  file_size INTEGER,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_properties_agent_id ON properties(agent_id);
CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_property_images_property_id ON property_images(property_id);
CREATE INDEX IF NOT EXISTS idx_property_images_uploaded_at ON property_images(uploaded_at DESC);

-- Enable Row Level Security (only if not already enabled)
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE property_images ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their own properties" ON properties;
DROP POLICY IF EXISTS "Users can create their own properties" ON properties;
DROP POLICY IF EXISTS "Users can update their own properties" ON properties;
DROP POLICY IF EXISTS "Users can delete their own properties" ON properties;
DROP POLICY IF EXISTS "Users can view images from their properties" ON property_images;
DROP POLICY IF EXISTS "Users can upload images to their properties" ON property_images;
DROP POLICY IF EXISTS "Users can delete images from their properties" ON property_images;

-- Recreate policies
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

-- Create or replace the update function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Drop existing trigger if it exists, then recreate
DROP TRIGGER IF EXISTS update_properties_updated_at ON properties;
CREATE TRIGGER update_properties_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Property Folders System schema applied successfully!';
  RAISE NOTICE 'Tables: properties, property_images';
  RAISE NOTICE 'Indexes: 4 created';
  RAISE NOTICE 'Policies: 7 created';
  RAISE NOTICE 'Triggers: 1 created';
END $$;