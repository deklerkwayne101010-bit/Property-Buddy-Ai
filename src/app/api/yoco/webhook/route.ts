import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createSecurityHeaders, logSecurityEvent } from '../../../../lib/security';

interface WebhookEvent {
  type: string;
  data: {
    id: string;
    amount: number;
    currency: string;
    status: string;
    metadata?: Record<string, unknown>;
    checkoutId?: string;
  };
}

export async function POST(request: NextRequest) {
  try {
    // Get raw body for webhook signature verification
    const rawBody = await request.text();
    // const signature = request.headers.get('x-yoco-signature'); // TODO: Implement signature verification

    // Verify webhook signature (recommended for production)
    // For now, we'll trust the request but you should implement signature verification

    let eventData: WebhookEvent;
    try {
      eventData = JSON.parse(rawBody) as WebhookEvent;
    } catch {
      return NextResponse.json(
        { error: 'Invalid JSON payload' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    const { type, data } = eventData;

    logSecurityEvent('YOCO_WEBHOOK_RECEIVED', {
      type,
      paymentId: data?.id,
      status: data?.status,
      amount: data?.amount,
      metadata: data?.metadata
    });

    // Handle different webhook event types
    switch (type) {
      case 'payment.succeeded':
        await handlePaymentSucceeded(data as PaymentData);
        break;

      case 'payment.failed':
        await handlePaymentFailed(data as PaymentData);
        break;

      case 'payment.cancelled':
        await handlePaymentCancelled(data as PaymentData);
        break;

      default:
        console.log('Unhandled webhook event type:', type);
    }

    // Always return 200 to acknowledge receipt
    return NextResponse.json(
      { received: true },
      { status: 200, headers: createSecurityHeaders() }
    );

  } catch (error) {
    console.error('Error processing YOCO webhook:', error);
    logSecurityEvent('WEBHOOK_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error',
      endpoint: '/api/yoco/webhook'
    });

    // Still return 200 to prevent retries for unhandled errors
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 200, headers: createSecurityHeaders() }
    );
  }
}

interface PaymentData {
  id: string;
  amount: number;
  currency: string;
  status: string;
  metadata?: Record<string, unknown>;
  checkoutId?: string;
}

async function handlePaymentSucceeded(paymentData: PaymentData) {
  const { id: paymentId, amount, currency, metadata } = paymentData;

  try {
    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        yoco_payment_id: paymentId
      })
      .eq('yoco_checkout_id', paymentData.checkoutId);

    if (updateError) {
      console.error('Error updating payment session:', updateError);
    }

    // Create payment record
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        user_id: metadata?.userId,
        amount: amount,
        currency: currency,
        status: 'completed',
        payment_method: 'yoco',
        metadata: metadata,
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating payment record:', insertError);
    }

    // Handle different payment types based on metadata
    if (metadata?.type === 'subscription') {
      await handleSubscriptionPayment(metadata, amount);
    } else if (metadata?.type === 'credits') {
      await handleCreditsPurchase(metadata, amount);
    } else if (metadata?.type === 'template') {
      await handleTemplatePurchase(metadata, amount);
    }

    logSecurityEvent('PAYMENT_SUCCEEDED', {
      paymentId,
      userId: metadata?.userId,
      amount,
      currency,
      type: metadata?.type
    });

  } catch (error) {
    console.error('Error handling successful payment:', error);
    logSecurityEvent('PAYMENT_PROCESSING_ERROR', {
      paymentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePaymentFailed(paymentData: PaymentData) {
  const { id: paymentId, metadata } = paymentData;

  try {
    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString()
      })
      .eq('yoco_checkout_id', paymentData.checkoutId);

    if (updateError) {
      console.error('Error updating failed payment session:', updateError);
    }

    logSecurityEvent('PAYMENT_FAILED', {
      paymentId,
      userId: metadata?.userId,
      checkoutId: paymentData.checkoutId
    });

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

async function handlePaymentCancelled(paymentData: PaymentData) {
  const { id: paymentId, metadata } = paymentData;

  try {
    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('yoco_checkout_id', paymentData.checkoutId);

    if (updateError) {
      console.error('Error updating cancelled payment session:', updateError);
    }

    logSecurityEvent('PAYMENT_CANCELLED', {
      paymentId,
      userId: metadata?.userId,
      checkoutId: paymentData.checkoutId
    });

  } catch (error) {
    console.error('Error handling cancelled payment:', error);
  }
}

async function handleSubscriptionPayment(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle subscription payment logic
  // Update user subscription status, extend expiry, etc.
  console.log('Processing subscription payment:', metadata, amount);
}

async function handleCreditsPurchase(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle AI credits purchase
  // Add credits to user account
  console.log('Processing credits purchase:', metadata, amount);
}

async function handleTemplatePurchase(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle template purchase
  // Grant access to template
  console.log('Processing template purchase:', metadata, amount);
}