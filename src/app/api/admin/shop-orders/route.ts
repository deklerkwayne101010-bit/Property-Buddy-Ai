import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = ['deklerkwayne101010@gmail.com', 'admin@propertybuddy.ai', 'wayne@propertybuddy.ai'];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all orders with user details and order items
    const { data: orders, error: ordersError } = await supabase
      .from('shop_orders')
      .select(`
        *,
        profiles:user_id (
          full_name,
          company_name
        ),
        shop_order_items (
          quantity,
          price_at_time,
          shop_products (
            name,
            description,
            image_url
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (ordersError) {
      console.error('Error fetching orders:', ordersError);
      return NextResponse.json({ error: 'Failed to fetch orders' }, { status: 500 });
    }

    // Get order statistics
    const { count: totalOrders } = await supabase
      .from('shop_orders')
      .select('*', { count: 'exact', head: true });

    const { data: revenueData } = await supabase
      .from('shop_orders')
      .select('total_amount, status')
      .eq('status', 'paid');

    const totalRevenue = revenueData?.reduce((sum, order) => sum + parseFloat(order.total_amount), 0) || 0;

    const stats = {
      totalOrders: totalOrders || 0,
      totalRevenue: Math.round(totalRevenue * 100) / 100, // Round to 2 decimal places
      pendingOrders: orders?.filter(order => order.status === 'pending').length || 0,
      paidOrders: orders?.filter(order => order.status === 'paid').length || 0,
      shippedOrders: orders?.filter(order => order.status === 'shipped').length || 0,
      deliveredOrders: orders?.filter(order => order.status === 'delivered').length || 0
    };

    return NextResponse.json({
      success: true,
      orders: orders || [],
      stats
    });

  } catch (error) {
    console.error('Admin shop orders API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = ['deklerkwayne101010@gmail.com', 'admin@propertybuddy.ai', 'wayne@propertybuddy.ai'];
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { orderId, status } = await request.json();

    if (!orderId || !status) {
      return NextResponse.json({ error: 'Order ID and status are required' }, { status: 400 });
    }

    const validStatuses = ['pending', 'paid', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    // Update order status
    const { error: updateError } = await supabase
      .from('shop_orders')
      .update({
        status,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    if (updateError) {
      console.error('Error updating order status:', updateError);
      return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Order status updated successfully'
    });

  } catch (error) {
    console.error('Admin update order API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}