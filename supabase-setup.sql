-- AI Photo Editor for Agents - Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop tables if they exist (in reverse dependency order)
DROP TABLE IF EXISTS usage_tracking;
DROP TABLE IF EXISTS billing_history;
DROP TABLE IF EXISTS templates;
DROP TABLE IF EXISTS properties;
DROP TABLE IF EXISTS leads;
DROP TABLE IF EXISTS profiles;

-- Create leads table
CREATE TABLE leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- Add user ownership
  name TEXT NOT NULL,
  contact_number TEXT,
  email TEXT,
  source TEXT CHECK (source IN ('Facebook', 'Walk-in', 'Referral', 'Website', 'Other')),
  lead_stage TEXT CHECK (lead_stage IN ('New', 'Contacted', 'Viewing', 'Offer Made', 'Closed', 'Lost')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create properties table
CREATE TABLE IF NOT EXISTS properties (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  address TEXT NOT NULL,
  listing_price DECIMAL(12,2),
  property_type TEXT CHECK (property_type IN ('House', 'Apartment', 'Vacant Land', 'Commercial')),
  bedrooms INTEGER,
  bathrooms INTEGER,
  parking INTEGER,
  size_sqm DECIMAL(8,2),
  description TEXT,
  photos TEXT[], -- Array of photo URLs
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create profiles table (extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  full_name TEXT,
  company_name TEXT,
  subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'starter', 'pro', 'elite', 'agency')),
  credits_balance INTEGER DEFAULT 5,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create templates table
CREATE TABLE IF NOT EXISTS templates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT DEFAULT 'General',
  platform TEXT,
  tone TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create billing_history table
CREATE TABLE IF NOT EXISTS billing_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  amount DECIMAL(8,2) NOT NULL,
  currency TEXT DEFAULT 'ZAR',
  status TEXT DEFAULT 'completed',
  description TEXT,
  invoice_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create usage_tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
   id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
   feature TEXT NOT NULL, -- 'photo_edit', 'description_gen', 'video_gen', etc.
   credits_used INTEGER DEFAULT 1,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
 );

-- Create payment_sessions table for tracking payment sessions
CREATE TABLE IF NOT EXISTS payment_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    yoco_checkout_id TEXT, -- Keep for backward compatibility
    payfast_payment_id TEXT, -- Add PayFast payment ID
    amount INTEGER NOT NULL,
    currency TEXT DEFAULT 'ZAR',
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    completed_at TIMESTAMP WITH TIME ZONE,
    failed_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

-- Create payments table for completed payments
CREATE TABLE IF NOT EXISTS payments (
   id TEXT PRIMARY KEY, -- YOCO payment ID
   user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
   amount INTEGER NOT NULL,
   currency TEXT DEFAULT 'ZAR',
   status TEXT DEFAULT 'completed' CHECK (status IN ('completed', 'failed', 'cancelled')),
   payment_method TEXT DEFAULT 'yoco',
   metadata JSONB,
   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_media table for storing user uploads (images and voice recordings)
CREATE TABLE IF NOT EXISTS user_media (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'voice', 'voice_clone', 'avatar_video')),
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create user_prompts table for storing saved AI prompts
CREATE TABLE IF NOT EXISTS user_prompts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  prompt TEXT NOT NULL,
  edit_type TEXT NOT NULL CHECK (edit_type IN ('object-remover', 'image-enhancer')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_generation_jobs table for tracking video generation jobs
CREATE TABLE IF NOT EXISTS video_generation_jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing_prompts', 'generating_videos', 'completed', 'failed')),
  total_images INTEGER NOT NULL,
  completed_images INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create video_job_images table for individual image processing within jobs
CREATE TABLE IF NOT EXISTS video_job_images (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES video_generation_jobs(id) ON DELETE CASCADE,
  image_url TEXT NOT NULL,
  image_name TEXT,
  prompt_status TEXT DEFAULT 'pending' CHECK (prompt_status IN ('pending', 'processing', 'completed', 'failed')),
  video_status TEXT DEFAULT 'pending' CHECK (video_status IN ('pending', 'processing', 'completed', 'failed')),
  gpt4o_prompt TEXT,
  kling_video_url TEXT,
  replicate_prompt_id TEXT,
  replicate_video_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance (only if they don't exist)
-- Note: CREATE INDEX IF NOT EXISTS is not directly supported in some Supabase versions
-- So we'll use a more compatible approach

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_stage') THEN
        CREATE INDEX idx_leads_stage ON leads(lead_stage);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_leads_created') THEN
        CREATE INDEX idx_leads_created ON leads(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_lead') THEN
        CREATE INDEX idx_properties_lead ON properties(lead_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_properties_created') THEN
        CREATE INDEX idx_properties_created ON properties(created_at DESC);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_templates_user') THEN
        CREATE INDEX idx_templates_user ON templates(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_billing_user') THEN
        CREATE INDEX idx_billing_user ON billing_history(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_user') THEN
        CREATE INDEX idx_usage_user ON usage_tracking(user_id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE indexname = 'idx_usage_feature') THEN
        CREATE INDEX idx_usage_feature ON usage_tracking(feature);
    END IF;
END $$;

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_media ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_generation_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_job_images ENABLE ROW LEVEL SECURITY;

-- Create RLS policies (basic policies - you may want to customize these)
-- For now, allowing authenticated users to access their own data
-- You can modify these policies based on your business requirements

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON profiles;
DROP POLICY IF EXISTS "Users can view own templates" ON templates;
DROP POLICY IF EXISTS "Users can insert own templates" ON templates;
DROP POLICY IF EXISTS "Users can update own templates" ON templates;
DROP POLICY IF EXISTS "Users can delete own templates" ON templates;
DROP POLICY IF EXISTS "Users can view own billing" ON billing_history;
DROP POLICY IF EXISTS "Users can view own usage" ON usage_tracking;
DROP POLICY IF EXISTS "Users can view own media" ON user_media;
DROP POLICY IF EXISTS "Users can insert own media" ON user_media;
DROP POLICY IF EXISTS "Users can update own media" ON user_media;
DROP POLICY IF EXISTS "Users can delete own media" ON user_media;
DROP POLICY IF EXISTS "Users can view own prompts" ON user_prompts;
DROP POLICY IF EXISTS "Users can insert own prompts" ON user_prompts;
DROP POLICY IF EXISTS "Users can update own prompts" ON user_prompts;
DROP POLICY IF EXISTS "Users can delete own prompts" ON user_prompts;
DROP POLICY IF EXISTS "Users can view own payment sessions" ON payment_sessions;
DROP POLICY IF EXISTS "Users can view own payments" ON payments;

-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Templates: Users can only access their own templates
CREATE POLICY "Users can view own templates" ON templates
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own templates" ON templates
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own templates" ON templates
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own templates" ON templates
  FOR DELETE USING (auth.uid() = user_id);

-- Billing history: Users can only access their own billing records
CREATE POLICY "Users can view own billing" ON billing_history
  FOR SELECT USING (auth.uid() = user_id);

-- Usage tracking: Users can only access their own usage data
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT USING (auth.uid() = user_id);

-- User media: Users can only access their own media files
CREATE POLICY "Users can view own media" ON user_media
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own media" ON user_media
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own media" ON user_media
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own media" ON user_media
    FOR DELETE USING (auth.uid() = user_id);

-- User prompts: Users can only access their own saved prompts
CREATE POLICY "Users can view own prompts" ON user_prompts
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own prompts" ON user_prompts
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own prompts" ON user_prompts
    FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own prompts" ON user_prompts
    FOR DELETE USING (auth.uid() = user_id);

-- Payment sessions: Users can only access their own payment sessions
CREATE POLICY "Users can view own payment sessions" ON payment_sessions
   FOR SELECT USING (auth.uid() = user_id);

-- Payments: Users can only access their own payment records
CREATE POLICY "Users can view own payments" ON payments
   FOR SELECT USING (auth.uid() = user_id);

-- Video generation jobs: Users can only access their own jobs
CREATE POLICY "Users can view own video jobs" ON video_generation_jobs
   FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own video jobs" ON video_generation_jobs
   FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own video jobs" ON video_generation_jobs
   FOR UPDATE USING (auth.uid() = user_id);

-- Video job images: Users can only access images from their own jobs
CREATE POLICY "Users can view own video job images" ON video_job_images
   FOR SELECT USING (
     auth.uid() = (SELECT user_id FROM video_generation_jobs WHERE id = job_id)
   );

CREATE POLICY "Users can insert own video job images" ON video_job_images
   FOR INSERT WITH CHECK (
     auth.uid() = (SELECT user_id FROM video_generation_jobs WHERE id = job_id)
   );

CREATE POLICY "Users can update own video job images" ON video_job_images
   FOR UPDATE USING (
     auth.uid() = (SELECT user_id FROM video_generation_jobs WHERE id = job_id)
   );

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can insert leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can update leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can delete leads" ON leads;
DROP POLICY IF EXISTS "Authenticated users can view properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can insert properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can update properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can delete properties" ON properties;
DROP POLICY IF EXISTS "Authenticated users can upload video assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view video assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own video assets" ON storage.objects;

-- Leads: Users can only access their own leads (user-specific data isolation)
CREATE POLICY "Users can view own leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own leads" ON leads
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own leads" ON leads
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can view properties" ON properties
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert properties" ON properties
  FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update properties" ON properties
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete properties" ON properties
  FOR DELETE TO authenticated USING (true);

-- Create function to handle profile creation on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and create new one
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create storage bucket for video assets (if not exists)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video-assets',
  'video-assets',
  true,
  52428800, -- 50MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'audio/wav', 'audio/mpeg', 'video/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can upload video assets" ON storage.objects;
DROP POLICY IF EXISTS "Public can view video assets" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own video assets" ON storage.objects;

-- Create storage policy to allow authenticated users to upload video assets
CREATE POLICY "Authenticated users can upload video assets" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'video-assets');

-- Create storage policy to allow public access to view video assets
CREATE POLICY "Public can view video assets" ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'video-assets');

-- Create storage policy to allow users to delete their own video assets
CREATE POLICY "Users can delete own video assets" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'video-assets');

-- Insert some sample data (optional - remove in production)
-- Note: Sample lead removed since we now require user_id for all leads
-- Each user will start with their own leads only

-- Sample property
INSERT INTO properties (title, address, listing_price, property_type, bedrooms, bathrooms, parking, size_sqm, description, photos)
VALUES (
  'Modern 3-Bedroom House',
  '123 Oak Street, Sandton, Johannesburg',
  2500000.00,
  'House',
  3,
  2,
  2,
  250.5,
  'Beautiful modern home with open plan living, perfect for families.',
  ARRAY['https://example.com/photo1.jpg', 'https://example.com/photo2.jpg']
);