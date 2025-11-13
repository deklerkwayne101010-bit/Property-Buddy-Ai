import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { packageId, userId } = await request.json();

    if (!packageId || !userId) {
      return NextResponse.json(
        { error: 'Package ID and User ID are required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    // Get package details (prices in ZAR cents for PayFast)
    const packages = {
      '100': { credits: 100, price: 19900, currency: 'ZAR' }, // R199.00
      '500': { credits: 500, price: 79900, currency: 'ZAR' }, // R799.00
      '1000': { credits: 1000, price: 139900, currency: 'ZAR' } // R1399.00
    };

    const selectedPackage = packages[packageId as keyof typeof packages];
    if (!selectedPackage) {
      return NextResponse.json(
        { error: 'Invalid package ID' },
        { status: 400 }
      );
    }

    // Get user email for checkout
    const { data: userData, error: userError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Create PayFast checkout instead of direct credit update
    const checkoutResponse = await fetch(`${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/api/payfast/checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        // Note: PayFast checkout doesn't require auth token as it uses userId in metadata
      },
      body: JSON.stringify({
        amount: selectedPackage.price,
        currency: 'ZAR',
        description: `Credit purchase: ${selectedPackage.credits} credits`,
        metadata: {
          type: 'credits',
          credits: selectedPackage.credits,
          packageId: packageId,
          userId: userId
        }
      })
    });

    if (!checkoutResponse.ok) {
      const errorData = await checkoutResponse.json();
      return NextResponse.json({
        error: 'Failed to create payment checkout',
        details: errorData.error
      }, { status: 500 });
    }

    const checkoutData = await checkoutResponse.json();

    return NextResponse.json({
      success: true,
      checkout: checkoutData,
      package: selectedPackage
    });

  } catch (error) {
    console.error('Credits purchase error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json(
        { error: 'User ID is required' },
        { status: 400 }
      );
    }

    const supabase = supabaseAdmin;

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('credits_balance, subscription_tier')
      .eq('id', userId)
      .single();

    if (error) {
      // If profile doesn't exist, create it with default credits
      if (error.code === 'PGRST116') {
        const { data: newProfile, error: createError } = await supabase
          .from('profiles')
          .insert({
            id: userId,
            credits_balance: 5, // Default credits for new users (free tier)
            subscription_tier: 'free'
          })
          .select('credits_balance')
          .single();

        if (createError) {
          return NextResponse.json(
            { error: 'Failed to create user profile' },
            { status: 500 }
          );
        }

        return NextResponse.json({
          credits: newProfile.credits_balance || 0,
          subscriptionTier: 'free'
        });
      }

      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credits: profile.credits_balance || 0,
      subscriptionTier: profile.subscription_tier || 'free'
    });

  } catch (error) {
    console.error('Credits fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}