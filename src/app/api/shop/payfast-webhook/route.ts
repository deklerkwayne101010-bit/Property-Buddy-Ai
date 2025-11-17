import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const params = new URLSearchParams(body);
    const data: Record<string, string> = {};

    // Convert to object
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }

    // Verify signature
    const payfastPassphrase = process.env.PAYFAST_PASSPHRASE;
    if (!payfastPassphrase) {
      console.error('Payfast passphrase not configured');
      return NextResponse.json({ error: 'Configuration error' }, { status: 500 });
    }

    const signature = data.signature;
    delete data.signature;

    // Generate signature for verification
    const signatureString = Object.keys(data)
      .sort()
      .map(key => `${key}=${encodeURIComponent(data[key])}`)
      .join('&');

    const expectedSignature = crypto
      .createHash('md5')
      .update(signatureString + payfastPassphrase)
      .digest('hex');

    if (signature !== expectedSignature) {
      console.error('Invalid Payfast signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    // Process payment
    const paymentStatus = data.payment_status;
    const orderId = data.custom_str1; // Order ID we stored

    if (!orderId) {
      console.error('No order ID in Payfast data');
      return NextResponse.json({ error: 'Invalid data' }, { status: 400 });
    }

    if (paymentStatus === 'COMPLETE') {
      // Update order status to paid
      const { error: updateError } = await supabaseAdmin
        .from('shop_orders')
        .update({
          status: 'paid',
          payfast_payment_id: data.pf_payment_id,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order:', updateError);
        return NextResponse.json({ error: 'Failed to update order' }, { status: 500 });
      }

      console.log(`Order ${orderId} marked as paid`);
    } else if (paymentStatus === 'FAILED' || paymentStatus === 'CANCELLED') {
      // Update order status
      const newStatus = paymentStatus === 'FAILED' ? 'cancelled' : 'cancelled';

      const { error: updateError } = await supabaseAdmin
        .from('shop_orders')
        .update({
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', orderId);

      if (updateError) {
        console.error('Error updating order status:', updateError);
      }
    }

    // Payfast expects 200 OK response
    return NextResponse.json({ received: true });

  } catch (error) {
    console.error('Payfast webhook error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}