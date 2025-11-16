import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { createSecurityHeaders, logSecurityEvent } from '../../../../lib/security';
import crypto from 'crypto';

interface ITNData {
  m_payment_id: string;
  pf_payment_id: string;
  payment_status: string;
  item_name: string;
  item_description: string;
  amount_gross: string;
  amount_fee: string;
  amount_net: string;
  custom_str1: string; // userId
  custom_str2: string; // metadata JSON
  custom_str3: string; // payment type
  name_first: string;
  name_last: string;
  email_address: string;
  merchant_id: string;
  signature: string;
  [key: string]: string;
}

function verifyPayFastSignature(data: ITNData, passphrase: string): boolean {
  const passphraseEnv = process.env.PAYFAST_PASSPHRASE;
  if (!passphraseEnv) {
    console.error('PAYFAST_PASSPHRASE not configured');
    return false;
  }

  // Payfast requires parameters in the order they appear in the ITN documentation, NOT alphabetically
  // ITN parameter order: m_payment_id, pf_payment_id, payment_status, item_name, item_description,
  // amount_gross, amount_fee, amount_net, custom_str1-5, custom_int1-5, name_first, name_last,
  // email_address, merchant_id, signature (excluded)

  const parameterOrder = [
    'm_payment_id', 'pf_payment_id', 'payment_status', 'item_name', 'item_description',
    'amount_gross', 'amount_fee', 'amount_net',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'name_first', 'name_last', 'email_address', 'merchant_id'
  ];

  // Create signature string in correct order
  let signatureString = '';
  for (const key of parameterOrder) {
    if (key !== 'signature' && data[key as keyof ITNData] !== undefined && data[key as keyof ITNData] !== '') {
      signatureString += `${key}=${encodeURIComponent(data[key as keyof ITNData]).replace(/%20/g, '+')}&`;
    }
  }

  // Remove trailing & and add passphrase
  signatureString = signatureString.slice(0, -1) + `&passphrase=${encodeURIComponent(passphraseEnv)}`;

  // Generate MD5 hash
  const calculatedSignature = crypto.createHash('md5').update(signatureString).digest('hex');

  // Compare signatures
  return calculatedSignature === data.signature;
}

export async function POST(request: NextRequest) {
  try {
    console.log('=== PAYFAST ITN RECEIVED ===');

    // Get form data from PayFast ITN
    const formData = await request.formData();
    console.log('Form data received:', Object.fromEntries(formData.entries()));

    // Convert form data to ITN data object
    const itnData: ITNData = {} as ITNData;
    for (const [key, value] of formData.entries()) {
      itnData[key as keyof ITNData] = value as string;
    }

    console.log('ITN Data:', JSON.stringify(itnData, null, 2));

    // Verify signature
    const passphrase = process.env.PAYFAST_PASSPHRASE;
    if (!passphrase) {
      console.error('PAYFAST_PASSPHRASE not configured');
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const signatureValid = verifyPayFastSignature(itnData, passphrase);
    if (!signatureValid) {
      console.error('Invalid PayFast signature');
      logSecurityEvent('PAYFAST_INVALID_SIGNATURE', {
        paymentId: itnData.m_payment_id,
        pfPaymentId: itnData.pf_payment_id
      });
      return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
    }

    console.log('PayFast signature verified successfully');

    logSecurityEvent('PAYFAST_ITN_RECEIVED', {
      paymentId: itnData.m_payment_id,
      pfPaymentId: itnData.pf_payment_id,
      status: itnData.payment_status,
      amount: itnData.amount_gross,
      userId: itnData.custom_str1
    });

    // Handle different payment statuses
    switch (itnData.payment_status) {
      case 'COMPLETE':
        console.log('Processing COMPLETE payment');
        await handlePaymentComplete(itnData);
        break;

      case 'FAILED':
        console.log('Processing FAILED payment');
        await handlePaymentFailed(itnData);
        break;

      case 'CANCELLED':
        console.log('Processing CANCELLED payment');
        await handlePaymentCancelled(itnData);
        break;

      default:
        console.log('Unhandled payment status:', itnData.payment_status);
    }

    // Always return 200 to acknowledge receipt
    return new Response('OK', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        ...createSecurityHeaders()
      }
    });

  } catch (error) {
    console.error('Error processing PayFast ITN:', error);
    logSecurityEvent('PAYFAST_ITN_ERROR', {
      error: error instanceof Error ? error.message : 'Unknown error'
    });

    // Still return 200 to prevent retries for unhandled errors
    return new Response('ERROR', {
      status: 200,
      headers: {
        'Content-Type': 'text/plain',
        ...createSecurityHeaders()
      }
    });
  }
}

async function handlePaymentComplete(itnData: ITNData) {
  const { m_payment_id: paymentId, pf_payment_id: pfPaymentId, amount_gross, custom_str1: userId, custom_str2: metadataStr, custom_str3: paymentType } = itnData;

  console.log('=== PAYMENT COMPLETE HANDLER ===');
  console.log('Payment ID:', paymentId);
  console.log('PF Payment ID:', pfPaymentId);
  console.log('Amount:', amount_gross);
  console.log('User ID:', userId);
  console.log('Payment Type:', paymentType);

  try {
    // Parse metadata
    let metadata = {};
    try {
      metadata = JSON.parse(metadataStr || '{}');
    } catch (e) {
      console.warn('Failed to parse metadata JSON:', e);
    }

    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        payfast_payment_id: pfPaymentId
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating payment session:', updateError);
    }

    // Create payment record
    const amountInCents = Math.round(parseFloat(amount_gross) * 100);
    const { error: insertError } = await supabase
      .from('payments')
      .insert({
        id: pfPaymentId,
        user_id: userId,
        amount: amountInCents,
        currency: 'ZAR',
        status: 'completed',
        payment_method: 'payfast',
        metadata: {
          ...metadata,
          m_payment_id: paymentId,
          pf_payment_id: pfPaymentId,
          payment_type: paymentType
        },
        created_at: new Date().toISOString()
      });

    if (insertError) {
      console.error('Error creating payment record:', insertError);
    }

    // Handle different payment types
    console.log('Processing payment with type:', paymentType);
    console.log('Metadata:', JSON.stringify(metadata, null, 2));

    if (paymentType === 'subscription') {
      console.log('Handling subscription payment');
      await handleSubscriptionPayment(metadata, amountInCents);
    } else if (paymentType === 'credits') {
      console.log('Processing credits purchase - calling handleCreditsPurchase');
      await handleCreditsPurchase(metadata, amountInCents);
    } else if (paymentType === 'template') {
      console.log('Handling template purchase');
      await handleTemplatePurchase(metadata, amountInCents);
    } else {
      console.log('Unknown payment type:', paymentType, 'Available metadata keys:', Object.keys(metadata));
    }

    logSecurityEvent('PAYFAST_PAYMENT_COMPLETED', {
      paymentId,
      pfPaymentId,
      userId,
      amount: amountInCents,
      type: paymentType
    });

  } catch (error) {
    console.error('Error handling completed payment:', error);
    logSecurityEvent('PAYFAST_PAYMENT_PROCESSING_ERROR', {
      paymentId,
      pfPaymentId,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handlePaymentFailed(itnData: ITNData) {
  const { m_payment_id: paymentId, custom_str1: userId } = itnData;

  try {
    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'failed',
        failed_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating failed payment session:', updateError);
    }

    logSecurityEvent('PAYFAST_PAYMENT_FAILED', {
      paymentId,
      userId,
      pfPaymentId: itnData.pf_payment_id
    });

  } catch (error) {
    console.error('Error handling failed payment:', error);
  }
}

async function handlePaymentCancelled(itnData: ITNData) {
  const { m_payment_id: paymentId, custom_str1: userId } = itnData;

  try {
    // Update payment session status
    const { error: updateError } = await supabase
      .from('payment_sessions')
      .update({
        status: 'cancelled',
        cancelled_at: new Date().toISOString()
      })
      .eq('id', paymentId);

    if (updateError) {
      console.error('Error updating cancelled payment session:', updateError);
    }

    logSecurityEvent('PAYFAST_PAYMENT_CANCELLED', {
      paymentId,
      userId,
      pfPaymentId: itnData.pf_payment_id
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
        user_id: metadata.userId as string,
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

  try {
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