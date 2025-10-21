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

    // Here you would integrate with your payment processor (Stripe, PayPal, etc.)
    // For now, we'll simulate a successful payment

    // Update user credits
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (userError) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const newCredits = (user.credits || 0) + selectedPackage.credits;

    const { error: updateError } = await supabase
      .from('users')
      .update({ credits: newCredits })
      .eq('id', userId);

    if (updateError) {
      return NextResponse.json(
        { error: 'Failed to update credits' },
        { status: 500 }
      );
    }

    // Log the transaction
    const { error: transactionError } = await supabase
      .from('credit_transactions')
      .insert({
        user_id: userId,
        package_id: packageId,
        credits_added: selectedPackage.credits,
        amount_paid: selectedPackage.price,
        payment_status: 'completed'
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

    const { data: user, error } = await supabase
      .from('users')
      .select('credits')
      .eq('id', userId)
      .single();

    if (error) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      credits: user.credits || 0
    });

  } catch (error) {
    console.error('Credits fetch error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}