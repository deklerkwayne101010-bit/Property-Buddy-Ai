import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import {
  checkRateLimit,
  getClientIP,
  createSecurityHeaders,
  logSecurityEvent
} from '../../../../lib/security';

// Rate limiting: 10 checkouts per minute per IP
const RATE_LIMIT_CONFIG = {
  maxRequestSize: 1024 * 1024, // 1MB
  allowedOrigins: ['http://localhost:3000', 'https://yourdomain.com'],
  rateLimitWindow: 60 * 1000, // 1 minute
  rateLimitMax: 10,
};

interface CheckoutRequest {
  amount: number;
  currency: string;
  description?: string;
  metadata?: Record<string, unknown>;
}

interface YocoCheckoutResponse {
  id: string;
  redirectUrl: string;
  amount: number;
  currency: string;
}

async function createYocoCheckout(checkoutData: CheckoutRequest): Promise<YocoCheckoutResponse> {
  const yocoSecretKey = process.env.YOCO_SECRET_KEY;

  if (!yocoSecretKey) {
    throw new Error('YOCO_SECRET_KEY not configured');
  }

  const response = await fetch('https://payments.yoco.com/api/checkouts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${yocoSecretKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: checkoutData.amount,
      currency: checkoutData.currency,
      description: checkoutData.description || 'Property Buddy AI Payment',
      successUrl: checkoutData.metadata?.successUrl as string,
      cancelUrl: checkoutData.metadata?.cancelUrl as string,
      metadata: checkoutData.metadata || {},
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`YOCO API error: ${response.status} - ${errorText}`);
  }

  return await response.json();
}

export async function POST(request: NextRequest) {
  const clientIP = getClientIP(request);

  try {
    // Security checks
    const rateLimitResult = checkRateLimit(clientIP, RATE_LIMIT_CONFIG);
    if (!rateLimitResult.allowed) {
      logSecurityEvent('RATE_LIMIT_EXCEEDED', { ip: clientIP, endpoint: '/api/yoco/checkout' });
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

    // Check authentication (optional for demo - allow unauthenticated payments)
    let user = null;
    try {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      user = authUser;
    } catch (authError) {
      console.log('Auth not available, proceeding without authentication for demo');
    }

    const body: CheckoutRequest = await request.json();
    const { amount, currency, description, metadata } = body;

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

    // Validate currency (only ZAR for now)
    if (currency !== 'ZAR') {
      return NextResponse.json(
        { error: 'Only ZAR currency is supported' },
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

    // Create checkout with YOCO
    const checkoutData = {
      amount,
      currency,
      description: description || `Payment for ${user?.email || 'guest'}`,
      metadata: {
        userId: user?.id || 'guest',
        userEmail: user?.email || 'guest@example.com',
        successUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3041'}/payment?success=true`,
        cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3041'}/payment?canceled=true`,
        ...metadata
      }
    };

    const yocoResponse = await createYocoCheckout(checkoutData);

    // Store checkout session in database for tracking (optional - skip if table doesn't exist)
    if (user) {
      try {
        const { error: dbError } = await supabase
          .from('payment_sessions')
          .insert({
            id: yocoResponse.id,
            user_id: user.id,
            amount: amount,
            currency: currency,
            status: 'pending',
            yoco_checkout_id: yocoResponse.id,
            metadata: checkoutData.metadata,
            created_at: new Date().toISOString()
          });

        if (dbError) {
          console.error('Database error storing payment session:', dbError);
          // Don't fail the request, just log it
        }
      } catch (dbError) {
        console.error('Database not available for payment tracking:', dbError);
        // Continue without database tracking
      }
    }

    logSecurityEvent('PAYMENT_CHECKOUT_CREATED', {
      checkoutId: yocoResponse.id,
      userId: user?.id || 'guest',
      amount: amount,
      currency: currency,
      ip: clientIP
    });

    return NextResponse.json({
      success: true,
      checkoutId: yocoResponse.id,
      redirectUrl: yocoResponse.redirectUrl,
      amount: amount,
      currency: currency
    }, { headers: createSecurityHeaders() });

  } catch (error) {
    console.error('Error in YOCO checkout API:', error);
    logSecurityEvent('API_ERROR', {
      endpoint: '/api/yoco/checkout',
      method: 'POST',
      error: error instanceof Error ? error.message : 'Unknown error',
      ip: clientIP
    });

    return NextResponse.json(
      {
        error: 'Failed to create checkout',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500, headers: createSecurityHeaders() }
    );
  }
}