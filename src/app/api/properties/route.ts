import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = supabaseAdmin;

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all properties for this agent
    const { data: properties, error } = await supabase
      .from('properties')
      .select(`
        id,
        name,
        created_at,
        updated_at,
        property_images (
          id,
          filename,
          original_filename,
          url,
          uploaded_at
        )
      `)
      .eq('agent_id', user.id)
      .order('updated_at', { ascending: false });

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
    const supabase = supabaseAdmin;
    const { name } = await request.json();

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return NextResponse.json({ error: 'Property name is required' }, { status: 400 });
    }

    // Get current user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if property name already exists for this agent
    const { data: existingProperty } = await supabase
      .from('properties')
      .select('id')
      .eq('agent_id', user.id)
      .eq('name', name.trim())
      .single();

    if (existingProperty) {
      return NextResponse.json({ error: 'A property with this name already exists' }, { status: 409 });
    }

    // Create new property
    const { data: property, error } = await supabase
      .from('properties')
      .insert({
        name: name.trim(),
        agent_id: user.id
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating property:', error);
      return NextResponse.json({ error: 'Failed to create property' }, { status: 500 });
    }

    return NextResponse.json({ property }, { status: 201 });
  } catch (error) {
    console.error('Properties POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}