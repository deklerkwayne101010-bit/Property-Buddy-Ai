-- Marketing Materials Shop Database Schema
-- Run this SQL in your Supabase SQL Editor

-- Enable UUID extension (if not already enabled)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Shop Products Table
CREATE TABLE IF NOT EXISTS shop_products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10,2) NOT NULL,
  image_url TEXT,
  stock_quantity INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop Orders Table
CREATE TABLE IF NOT EXISTS shop_orders (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  total_amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled')),
  shipping_address JSONB,
  payfast_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Shop Order Items Table
CREATE TABLE IF NOT EXISTS shop_order_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES shop_orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES shop_products(id),
  quantity INTEGER NOT NULL,
  price_at_time DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE shop_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_order_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Products: Public can view active products
CREATE POLICY "Public can view active products" ON shop_products
  FOR SELECT USING (is_active = true);

-- Orders: Users can view and manage their own orders
CREATE POLICY "Users can view own orders" ON shop_orders
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own orders" ON shop_orders
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own orders" ON shop_orders
  FOR UPDATE USING (auth.uid() = user_id);

-- Order Items: Users can view and manage items from their orders
CREATE POLICY "Users can view own order items" ON shop_order_items
  FOR SELECT USING (
    auth.uid() = (SELECT user_id FROM shop_orders WHERE id = order_id)
  );

CREATE POLICY "Users can insert own order items" ON shop_order_items
  FOR INSERT WITH CHECK (
    auth.uid() = (SELECT user_id FROM shop_orders WHERE id = order_id)
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_shop_products_active ON shop_products(is_active);
CREATE INDEX IF NOT EXISTS idx_shop_orders_user ON shop_orders(user_id);
CREATE INDEX IF NOT EXISTS idx_shop_orders_status ON shop_orders(status);
CREATE INDEX IF NOT EXISTS idx_shop_order_items_order ON shop_order_items(order_id);

-- Sample products (optional - remove in production)
INSERT INTO shop_products (name, description, price, stock_quantity) VALUES
('Property Brochure Pack', 'Professional property brochures for real estate marketing', 150.00, 100),
('Business Card Set', 'Custom business cards for agents', 75.00, 50),
('Signage Kit', 'Property signage and open house banners', 200.00, 25);