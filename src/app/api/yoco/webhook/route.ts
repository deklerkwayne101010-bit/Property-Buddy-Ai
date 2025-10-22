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
  if (!metadata?.userId || !metadata?.planId) {
    console.error('Missing userId or planId in subscription metadata');
    return;
  }

  try {
    // Calculate subscription duration based on plan
    const planId = metadata.planId as string;
    let subscriptionTier = 'starter';
    let creditsToAdd = 0;

    if (planId.includes('pro')) {
      subscriptionTier = 'pro';
      creditsToAdd = 100; // Monthly credits for Pro plan
    } else if (planId.includes('elite')) {
      subscriptionTier = 'elite';
      creditsToAdd = 180; // Monthly credits for Elite plan
    } else if (planId.includes('agency')) {
      subscriptionTier = 'agency';
      creditsToAdd = 350; // Monthly credits for Agency plan
    } else {
      creditsToAdd = 5; // Free plan
    }

    // First get current credits (or create profile if it doesn't exist)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', metadata.userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      return;
    }

    const currentCredits = profile?.credits_balance || 0;
    const newCredits = currentCredits + creditsToAdd;

    // Update user subscription tier and add monthly credits
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: metadata.userId,
        subscription_tier: subscriptionTier === 'starter' && creditsToAdd === 5 ? 'free' : subscriptionTier,
        credits_balance: newCredits
      });

    if (updateError) {
      console.error('Error updating subscription:', updateError);
      return;
    }

    // Log the subscription activation
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: metadata.userId,
        amount: amount / 100, // Convert cents to rand
        currency: 'ZAR',
        status: 'completed',
        description: `Subscription: ${subscriptionTier} plan - ${creditsToAdd} monthly credits added`
      });

    if (billingError) {
      console.error('Error logging subscription:', billingError);
    }

    console.log(`Activated ${subscriptionTier} subscription for user ${metadata.userId}, added ${creditsToAdd} credits`);
  } catch (error) {
    console.error('Error processing subscription payment:', error);
  }
}

async function handleCreditsPurchase(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle AI credits purchase
  // Add credits to user account based on package purchased
  if (!metadata?.userId || !metadata?.packageId) {
    console.error('Missing userId or packageId in metadata for credits purchase');
    return;
  }

  try {
    const packageId = metadata.packageId as string;

    // Define credit packages (matching frontend)
    const creditPackages: Record<string, number> = {
      '50': 50,
      '100': 100,
      '200': 200,
      '300': 300
    };

    const creditsToAdd = creditPackages[packageId];
    if (!creditsToAdd) {
      console.error('Invalid package ID:', packageId);
      return;
    }

    // First get current credits (or create profile if it doesn't exist)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', metadata.userId)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching user profile:', profileError);
      return;
    }

    const currentCredits = profile?.credits_balance || 0;
    const newCredits = currentCredits + creditsToAdd;

    // Update or insert user credits in profiles table
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: metadata.userId,
        credits_balance: newCredits,
        subscription_tier: 'starter' // Default tier if not set
      });

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      return;
    }

    // Log the credit transaction
    const { error: logError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: metadata.userId,
        feature: 'credit_purchase',
        credits_used: -creditsToAdd, // Negative to indicate addition
        created_at: new Date().toISOString()
      });

    if (logError) {
      console.error('Error logging credit transaction:', logError);
    }

    // Log the billing transaction
    const { error: billingError } = await supabase
      .from('billing_history')
      .insert({
        user_id: metadata.userId,
        amount: amount / 100, // Convert cents to rand
        currency: 'ZAR',
        status: 'completed',
        description: `Credit purchase: ${creditsToAdd} credits`
      });

    if (billingError) {
      console.error('Error logging billing transaction:', billingError);
    }

    console.log(`Added ${creditsToAdd} credits to user ${metadata.userId} for package ${packageId}`);
  } catch (error) {
    console.error('Error processing credits purchase:', error);
  }
}

async function handleTemplatePurchase(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle template purchase
  // Grant access to template
  console.log('Processing template purchase:', metadata, amount);
}