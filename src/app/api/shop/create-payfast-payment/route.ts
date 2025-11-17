import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    const { cart, shippingAddress } = await request.json();

    if (!cart || !shippingAddress) {
      return NextResponse.json(
        { error: 'Cart and shipping address are required' },
        { status: 400 }
      );
    }

    // Calculate total
    const total = cart.reduce((sum: number, item: any) =>
      sum + (item.product.price * item.quantity), 0
    );

    // Create order
    const { data: order, error: orderError } = await supabaseAdmin
      .from('shop_orders')
      .insert({
        total_amount: total,
        shipping_address: shippingAddress,
        status: 'pending'
      })
      .select()
      .single();

    if (orderError) {
      console.error('Error creating order:', orderError);
      return NextResponse.json(
        { error: 'Failed to create order' },
        { status: 500 }
      );
    }

    // Create order items
    const orderItems = cart.map((item: any) => ({
      order_id: order.id,
      product_id: item.product.id,
      quantity: item.quantity,
      price_at_time: item.product.price
    }));

    const { error: itemsError } = await supabaseAdmin
      .from('shop_order_items')
      .insert(orderItems);

    if (itemsError) {
      console.error('Error creating order items:', itemsError);
      return NextResponse.json(
        { error: 'Failed to create order items' },
        { status: 500 }
      );
    }

    // Payfast configuration
    const payfastMerchantId = process.env.PAYFAST_MERCHANT_ID;
    const payfastMerchantKey = process.env.PAYFAST_MERCHANT_KEY;
    const payfastPassphrase = process.env.PAYFAST_PASSPHRASE;

    if (!payfastMerchantId || !payfastMerchantKey) {
      return NextResponse.json(
        { error: 'Payfast configuration missing' },
        { status: 500 }
      );
    }

    // Payfast data
    const payfastData = {
      merchant_id: payfastMerchantId,
      merchant_key: payfastMerchantKey,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketing-materials/payment-success?order_id=${order.id}`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/marketing-materials`,
      notify_url: `${process.env.NEXT_PUBLIC_APP_URL}/api/shop/payfast-webhook`,
      name_first: shippingAddress.firstName,
      name_last: shippingAddress.lastName,
      email_address: shippingAddress.email,
      cell_number: shippingAddress.phone,
      amount: total.toFixed(2),
      item_name: `Marketing Materials Order #${order.id}`,
      item_description: `Order containing ${cart.length} item(s)`,
      custom_str1: order.id, // Store order ID
      custom_int1: Math.floor(total * 100), // Amount in cents
      payment_method: 'cc', // Credit card
    };

    // Generate signature
    const signatureString = Object.keys(payfastData)
      .sort()
      .map(key => `${key}=${encodeURIComponent(payfastData[key as keyof typeof payfastData])}`)
      .join('&');

    const signature = crypto
      .createHash('md5')
      .update(signatureString + payfastPassphrase)
      .digest('hex');

    payfastData.signature = signature;

    return NextResponse.json({
      payfastData,
      orderId: order.id
    });

  } catch (error) {
    console.error('Error in create-payfast-payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}