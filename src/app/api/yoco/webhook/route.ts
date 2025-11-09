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
    console.log('=== YOCO WEBHOOK RECEIVED ===');
    console.log('Raw body:', rawBody);
    console.log('Headers:', Object.fromEntries(request.headers.entries()));

    // TODO: Implement signature verification for production
    // const signature = request.headers.get('x-yoco-signature');

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
    console.log('Event type:', type);
    console.log('Event data:', JSON.stringify(data, null, 2));

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
        console.log('Processing payment.succeeded event');
        await handlePaymentSucceeded(data as PaymentData);
        break;

      case 'payment.failed':
        console.log('Processing payment.failed event');
        await handlePaymentFailed(data as PaymentData);
        break;

      case 'payment.cancelled':
        console.log('Processing payment.cancelled event');
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

  console.log('=== PAYMENT SUCCEEDED HANDLER ===');
  console.log('Payment ID:', paymentId);
  console.log('Amount:', amount);
  console.log('Metadata received:', JSON.stringify(metadata, null, 2));

  try {
    // Update payment session status - try multiple ways to find the session
    let updateError = null;
    let sessionFound = false;

    // First try with checkoutId
    if (paymentData.checkoutId) {
      console.log('Trying to update with checkoutId:', paymentData.checkoutId);
      const { error } = await supabase
        .from('payment_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          yoco_payment_id: paymentId
        })
        .eq('yoco_checkout_id', paymentData.checkoutId);

      if (!error) {
        sessionFound = true;
        console.log('Payment session updated successfully with checkoutId');
      } else {
        console.log('Failed to update with checkoutId:', error);
        updateError = error;
      }
    }

    // If that didn't work, try with paymentId as fallback
    if (!sessionFound) {
      console.log('Trying to update with paymentId:', paymentId);
      const { error } = await supabase
        .from('payment_sessions')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          yoco_payment_id: paymentId
        })
        .eq('id', paymentId);

      if (!error) {
        sessionFound = true;
        console.log('Payment session updated successfully with paymentId');
      } else {
        console.log('Failed to update with paymentId:', error);
        updateError = error;
      }
    }

    if (updateError && !sessionFound) {
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
    console.log('Processing payment with metadata:', JSON.stringify(metadata, null, 2));
    console.log('Payment type:', metadata?.type);

    if (metadata?.type === 'subscription') {
      console.log('Handling subscription payment');
      await handleSubscriptionPayment(metadata, amount);
    } else if (metadata?.type === 'credits') {
      console.log('Processing credits purchase - calling handleCreditsPurchase');
      await handleCreditsPurchase(metadata, amount);
    } else if (metadata?.type === 'template') {
      console.log('Handling template purchase');
      await handleTemplatePurchase(metadata, amount);
    } else {
      console.log('Unknown payment type:', metadata?.type, 'Available metadata keys:', Object.keys(metadata || {}));
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
      .eq('id', userId)
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
  console.log('=== HANDLE CREDITS PURCHASE ===');
  console.log('Metadata received:', JSON.stringify(metadata, null, 2));

  if (!metadata?.userId) {
    console.error('❌ Missing userId in metadata for credits purchase');
    console.error('Available metadata keys:', Object.keys(metadata || {}));
    return;
  }

  if (!metadata?.credits) {
    console.error('❌ Missing credits in metadata for credits purchase');
    console.error('Available metadata keys:', Object.keys(metadata || {}));
    return;
  }

  const userId = metadata.userId as string;
  const creditsToAdd = metadata.credits as number;

  console.log('✅ Processing credits purchase for user:', userId, 'credits to add:', creditsToAdd);

  if (!creditsToAdd || creditsToAdd <= 0) {
    console.error('❌ Invalid credits amount:', creditsToAdd);
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
    console.log('Updating user credits - userId:', userId, 'currentCredits:', currentCredits, 'creditsToAdd:', creditsToAdd, 'newCredits:', newCredits);
    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: userId,
        credits_balance: newCredits,
        subscription_tier: 'starter' // Default tier if not set
      });

    if (updateError) {
      console.error('Error updating user credits:', updateError);
      console.error('Update error details:', JSON.stringify(updateError, null, 2));
      return;
    }
    console.log('Successfully updated user credits');

    // Log the credit transaction
    const { error: logError } = await supabase
      .from('usage_tracking')
      .insert({
        user_id: userId,
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
        user_id: userId,
        amount: amount / 100, // Convert cents to rand
        currency: 'ZAR',
        status: 'completed',
        description: `Credit purchase: ${creditsToAdd} credits`
      });

    if (billingError) {
      console.error('Error logging billing transaction:', billingError);
    }

    console.log(`✅ Successfully added ${creditsToAdd} credits to user ${userId}`);
    console.log(`📊 Credits summary: ${currentCredits} → ${newCredits}`);
  } catch (error) {
    console.error('❌ Error processing credits purchase:', error);
  }
}

async function handleTemplatePurchase(metadata: Record<string, unknown> | undefined, amount: number) {
  // Handle template purchase
  // Grant access to template
  console.log('Processing template purchase:', metadata, amount);
}