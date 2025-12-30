import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    // TEMPORARY: Bypass authentication for testing
    console.log('GET /api/admin/marketing-materials - Authentication bypassed for testing');

    // Fetch marketing materials
    const { data: materials, error } = await supabase
      .from('marketing_materials')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching marketing materials:', error);
      return NextResponse.json({ error: 'Failed to fetch marketing materials' }, { status: 500 });
    }

    return NextResponse.json({ materials: materials || [] });

  } catch (error) {
    console.error('Error in GET /api/admin/marketing-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // TEMPORARY: Bypass authentication for testing
    console.log('POST /api/admin/marketing-materials - Authentication bypassed for testing');

    const body = await request.json();
    const {
      name,
      description,
      price,
      image_url,
      category,
      tags,
      is_active,
      download_url,
      file_type,
      file_size
    } = body;

    // Validate required fields
    if (!name || !description || !price || !category) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert new marketing material
    const { data: material, error } = await supabase
      .from('marketing_materials')
      .insert({
        name,
        description,
        price: parseInt(price),
        image_url: image_url || null,
        category,
        tags: tags || [],
        is_active: is_active !== undefined ? is_active : true,
        download_url: download_url || null,
        file_type: file_type || null,
        file_size: file_size ? parseInt(file_size) : null
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating marketing material:', error);
      return NextResponse.json({ error: 'Failed to create marketing material' }, { status: 500 });
    }

    return NextResponse.json({ material });

  } catch (error) {
    console.error('Error in POST /api/admin/marketing-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    // TEMPORARY: Bypass authentication for testing
    console.log('PUT /api/admin/marketing-materials - Authentication bypassed for testing');

    const body = await request.json();
    const {
      id,
      name,
      description,
      price,
      image_url,
      category,
      tags,
      is_active,
      download_url,
      file_type,
      file_size
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
    }

    // Update marketing material
    const { data: material, error } = await supabase
      .from('marketing_materials')
      .update({
        name,
        description,
        price: parseInt(price),
        image_url: image_url || null,
        category,
        tags: tags || [],
        is_active: is_active !== undefined ? is_active : true,
        download_url: download_url || null,
        file_type: file_type || null,
        file_size: file_size ? parseInt(file_size) : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating marketing material:', error);
      return NextResponse.json({ error: 'Failed to update marketing material' }, { status: 500 });
    }

    return NextResponse.json({ material });

  } catch (error) {
    console.error('Error in PUT /api/admin/marketing-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // TEMPORARY: Bypass authentication for testing
    console.log('DELETE /api/admin/marketing-materials - Authentication bypassed for testing');

    const url = new URL(request.url);
    const id = url.searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Material ID is required' }, { status: 400 });
    }

    // Delete marketing material
    const { error } = await supabase
      .from('marketing_materials')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting marketing material:', error);
      return NextResponse.json({ error: 'Failed to delete marketing material' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error in DELETE /api/admin/marketing-materials:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}