import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import {
  checkRateLimit,
  validateRequestSize,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../../lib/security';
import crypto from 'crypto';

// Rate limiting: 10 checkouts per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'http://localhost:3002', 'https://property-buddy-4jzm4b62z-waynes-projects-d2d6b907.vercel.app'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
};

interface CheckoutRequest {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface PayFastCheckoutResponse {
  formData: Record<string, string>;
  paymentId: string;
}

function generatePayFastSignature(data: Record<string, string>, passphrase: string): string {
  // Payfast requires parameters in the order they appear in the documentation, NOT alphabetically
  // Order: merchant_id, merchant_key, return_url, cancel_url, notify_url, name_first, name_last,
  // email_address, cell_number, m_payment_id, amount, item_name, item_description,
  // custom_str1-5, custom_int1-5, payment_method, signature (excluded)

  const parameterOrder = [
    'merchant_id', 'merchant_key', 'return_url', 'cancel_url', 'notify_url',
    'name_first', 'name_last', 'email_address', 'cell_number',
    'm_payment_id', 'amount', 'item_name', 'item_description',
    'custom_str1', 'custom_str2', 'custom_str3', 'custom_str4', 'custom_str5',
    'custom_int1', 'custom_int2', 'custom_int3', 'custom_int4', 'custom_int5',
    'payment_method'
  ];

  // Create signature string in correct order
  let signatureString = '';
  for (const key of parameterOrder) {
    if (key !== 'signature' && data[key] !== undefined && data[key] !== '') {
      signatureString += `${key}=${encodeURIComponent(data[key]).replace(/%20/g, '+')}&`;
    }
  }

  // Remove trailing & and add passphrase
  signatureString = signatureString.slice(0, -1) + `&passphrase=${encodeURIComponent(passphrase)}`;

  // Generate MD5 hash
  return crypto.createHash('md5').update(signatureString).digest('hex');
}

async function createPayFastCheckout(checkoutData: CheckoutRequest, userId: string): Promise<PayFastCheckoutResponse> {
  const merchantId = process.env.PAYFAST_MERCHANT_ID;
  const merchantKey = process.env.PAYFAST_MERCHANT_KEY;
  const passphrase = process.env.PAYFAST_PASSPHRASE;

  if (!merchantId || !merchantKey || !passphrase) {
    throw new Error('PayFast credentials not configured');
  }

  // Generate unique payment ID
  const paymentId = `pf_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  // Prepare PayFast form data
  const formData: Record<string, string> = {
    merchant_id: merchantId,
    merchant_key: merchantKey,
    return_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment?success=true&payment_id=${paymentId}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/payment?canceled=true&payment_id=${paymentId}`,
    notify_url: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payfast/itn`,
    name_first: checkoutData.metadata?.firstName as string || 'Customer',
    name_last: checkoutData.metadata?.lastName as string || 'User',
    email_address: checkoutData.metadata?.email as string || 'customer@example.com',
    cell_number: checkoutData.metadata?.phone as string || '',
    m_payment_id: paymentId,
    amount: (checkoutData.amount / 100).toFixed(2), // Convert cents to rand
    item_name: checkoutData.description || 'Property Buddy AI Payment',
    item_description: checkoutData.description || 'Payment for Property Buddy AI services',
    custom_str1: userId, // Store user ID in custom field
    custom_str2: JSON.stringify(checkoutData.metadata || {}), // Store metadata
    custom_str3: checkoutData.metadata?.type as string || 'payment',
    payment_method: 'cc', // Credit card (can be overridden by user)
  };

  // Generate signature
  formData.signature = generatePayFastSignature(formData, passphrase);

  return {
    formData,
    paymentId
  };
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/payfast/checkout' });
      return NextResponse.json(
        {
          error: 'Rate limit exceeded',
          retryAfter: Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000)
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitResult.resetTime - Date.now()) / 1000).toString(),
            ...createSecurityHeaders()
          }
        }
      );
    }

    // Check authentication - required for payments
    let user = null;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
      console.log('User authenticated:', user?.id, 'email:', user?.email);
    } catch (authError) {
      console.log('Auth not available, proceeding without authentication for demo');
    }

    // Require authentication for payments
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required for payments' },
        { status: 401, headers: createSecurityHeaders() }
      );
    }

    const body: CheckoutRequest = await request.json();
    const { amount, currency, description, metadata } = body;
    console.log('PayFast checkout request body:', JSON.stringify(body, null, 2));

    // Validate required fields
    if (!amount || !currency) {
      return NextResponse.json(
        { error: 'Amount and currency are required' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate amount (must be in cents, positive integer)
    if (!Number.isInteger(amount) || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive integer (in cents)' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate currency (only ZAR for PayFast)
    if (currency !== 'ZAR') {
      return NextResponse.json(
        { error: 'Only ZAR currency is supported by PayFast' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Validate amount range (R1 to R100,000)
    if (amount < 100 || amount > 10000000) {
      return NextResponse.json(
        { error: 'Amount must be between R1 and R100,000' },
        { status: 400, headers: createSecurityHeaders() }
      );
    }

    // Create PayFast checkout
    const checkoutData = {
      amount,
      currency,
      description: description || `Payment for ${user?.email || 'guest'}`,
      metadata: {
        userId: user?.id || 'guest',
        userEmail: user?.email || 'guest@example.com',
        firstName: metadata?.firstName || 'Customer',
        lastName: metadata?.lastName || 'User',
        email: metadata?.email || user?.email || 'customer@example.com',
        phone: metadata?.phone || '',
        type: metadata?.type || 'payment',
        ...metadata
      }
    };

    const payfastResponse = await createPayFastCheckout(checkoutData, user.id);

    // Store checkout session in database for tracking
    try {
      const { error: dbError } = await supabase
        .from('payment_sessions')
        .insert({
          id: payfastResponse.paymentId,
          user_id: user.id,
          amount: amount,
          currency: currency,
          status: 'pending',
          payfast_payment_id: payfastResponse.paymentId,
          metadata: checkoutData.metadata,
          created_at: new Date().toISOString()
        });

      if (dbError) {
        console.error('Database error storing payment session:', dbError);
        // Don't fail the request, just log it
      } else {
        console.log('Payment session stored successfully for user:', user.id);
      }
    } catch (dbError) {
      console.error('Database not available for payment tracking:', dbError);
      // Continue without database tracking
    }

    logSecurityEvent('PAYFAST_CHECKOUT_CREATED', {
      paymentId: payfastResponse.paymentId,
      userId: user?.id || 'guest',
      amount: amount,
      currency: currency,
      ip: clientIP
    });

    return NextResponse.json({
      success: true,
      paymentId: payfastResponse.paymentId,
      formData: payfastResponse.formData,
      payfastUrl: process.env.NODE_ENV === 'production'
        ? 'https://www.payfast.co.za/eng/process'
        : 'https://sandbox.payfast.co.za/eng/process'
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in PayFast checkout API:', error);
    console.error('Error details:', error instanceof Error ? error.stack : 'Unknown error');
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/payfast/checkout',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to create PayFast checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}