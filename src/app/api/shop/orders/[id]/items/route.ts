import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: orderId } = await params;

    const { data: items, error } = await supabaseAdmin
      .from('shop_order_items')
      .select(`
        *,
        shop_products (
          id,
          name,
          description,
          price,
          image_url
        )
      `)
      .eq('order_id', orderId);

    if (error) {
      console.error('Error fetching order items:', error);
      return NextResponse.json(
        { error: 'Failed to fetch order items' },
        { status: 500 }
      );
    }

    return NextResponse.json({ items });
  } catch (error) {
    console.error('Error in order items API:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}