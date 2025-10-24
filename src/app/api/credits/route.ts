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

    // Get package details (prices in ZAR cents for YOCO)
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

    // Check if user has sufficient credits before deducting (for credit purchases)
    // This is handled by the credit validation in the UI, but double-check here

    // Update user credits in profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('credits_balance')
      .eq('id', userId)
      .single();

    if (profileError) {
      // If profile doesn't exist, create it with default credits
      if (profileError.code === 'PGRST116') {
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
          success: true,
          credits: newProfile.credits_balance || 0,
          added: selectedPackage.credits
        });
      }

      return NextResponse.json(
        { error: 'User profile not found' },
        { status: 404 }
      );
    }

    const newCredits = (profile.credits_balance || 0) + selectedPackage.credits;

    const { error: updateError } = await supabase
      .from('profiles')
      .update({ credits_balance: newCredits })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // Log the transaction in billing_history
    const { error: transactionError } = await supabase
      .from('billing_history')
      .insert({
        user_id: userId,
        amount: selectedPackage.price / 100, // Convert cents to rand
        currency: selectedPackage.currency,
        status: 'completed',
        description: `Credit purchase: ${selectedPackage.credits} credits`
      });

    if (transactionError) {
      console.error('Failed to log transaction:', transactionError);
    }

    return NextResponse.json({
      success: true,
      credits: newCredits,
      added: selectedPackage.credits
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
          credits: newProfile.credits_balance || 0
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