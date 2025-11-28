import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

interface PropertyImage {
  id: string;
  filename: string;
  original_filename: string;
  url: string;
  uploaded_at: string;
}

export async function GET(request: NextRequest) {
  try {
    // Get user from JWT token in Authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Create a Supabase client with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    // Get all properties for this agent
    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select(`
        id,
        title,
        created_at,
        updated_at
      `)
      .eq('agent_id', user.id)
      .order('updated_at', { ascending: false });

    // If properties exist, get their images separately
    if (properties && properties.length > 0) {
      for (const property of properties) {
        try {
          const { data: images } = await supabaseAdmin
            .from('property_images')
            .select('id, filename, original_filename, url, uploaded_at')
            .eq('property_id', property.id)
            .order('uploaded_at', { ascending: false });

          (property as typeof property & { property_images: PropertyImage[] }).property_images = images || [];
        } catch {
          console.log(`No images found for property ${property.id}, setting empty array`);
          (property as typeof property & { property_images: PropertyImage[] }).property_images = [];
        }
      }
    }

    if (error) {
      console.error('Error fetching properties:', error);
      return NextResponse.json({ error: 'Failed to fetch properties' }, { status: 500 });
    }

    return NextResponse.json({ properties });
  } catch (error) {
    console.error('Properties GET error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== Properties POST request started ===');

    const { name } = await request.json();
    console.log('Request body:', { name });

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      console.log('Validation failed: Property name is required');
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 });
    }

    // Get user from JWT token in Authorization header
    const authHeader = request.headers.get('authorization');
    console.log('Auth header present:', !!authHeader);

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('Authentication failed: No authorization header');
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix
    console.log('Token extracted, length:', token.length);

    // Create a Supabase client with the user's token
    const { createClient } = await import('@supabase/supabase-js');
    const userSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        global: {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      }
    );

    console.log('Supabase client created, getting user...');
    const { data: { user }, error: userError } = await userSupabase.auth.getUser();
    console.log('User auth result:', { user: user?.id, error: userError });

    if (userError || !user) {
      console.log('Authentication failed:', userError);
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    console.log('User authenticated:', user.id);

    // Check if property name already exists for this agent
    console.log('Checking for existing property...');
    const { data: existingProperty, error: checkError } = await supabaseAdmin
      .from('properties')
      .select('id')
      .eq('agent_id', user.id)
      .eq('title', name.trim())
      .single();

    console.log('Existing property check:', { existingProperty, checkError });

    if (existingProperty) {
      console.log('Property already exists');
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 409 });
    }

    // Create new property with only known required fields
    console.log('Creating new property...');
    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .insert({
        title: name.trim(),
        address: '', // Required field that exists
        agent_id: user.id
      })
      .select()
      .single();

    console.log('Property creation result:', { property, error });

    if (error) {
      console.error('Error creating property:', error);
      return NextResponse.json({ error: 'Failed to create property', details: error.message }, { status: 500 });
    }

    console.log('Property created successfully:', property);
    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Properties POST error:', error);
    return NextResponse.json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : String(error)
    }, { status: 500 });
  }
}