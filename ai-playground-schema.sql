-- AI Playground Database Schema
-- Add this to your existing supabase-setup.sql or run separately

-- Create generated_images table for storing AI-generated images
CREATE TABLE IF NOT EXISTS generated_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  tool_type TEXT NOT NULL CHECK (tool_type IN ('ai_playground', 'photo_editor', 'video_maker')),
  image_url TEXT NOT NULL,
  prompt TEXT NOT NULL,
  reference_images TEXT[], -- Array of reference image URLs
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE generated_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can insert own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can update own generated images" ON generated_images;
DROP POLICY IF EXISTS "Users can delete own generated images" ON generated_images;

CREATE POLICY "Users can view own generated images" ON generated_images
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own generated images" ON generated_images
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own generated images" ON generated_images
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own generated images" ON generated_images
  FOR DELETE USING (auth.uid() = user_id);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_generated_images_user ON generated_images(user_id);
CREATE INDEX IF NOT EXISTS idx_generated_images_tool ON generated_images(tool_type);
CREATE INDEX IF NOT EXISTS idx_generated_images_created ON generated_images(created_at DESC);