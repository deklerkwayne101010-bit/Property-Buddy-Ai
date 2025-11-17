import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch actual subscription data from the database
    const { data: profile } = await supabase
      .from('profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    const subscriptionTier = profile?.subscription_tier || 'free';

    // Map subscription tiers to plan details
    const planDetails = {
      free: {
        plan: 'Free Plan',
        price: 0,
        features: [
          '5 credits included monthly',
          'Access to AI Photo Editor only',
          'Basic photo editing features',
          'Community support'
        ]
      },
      starter: {
        plan: 'Starter Plan',
        price: 150.00,
        features: [
          '100 credits included',
          'Up to 50 photo edits per month',
          'Generate 2 AI property videos (30 seconds each)',
          'Access to basic property templates',
          'Email support'
        ]
      },
      pro: {
        plan: 'Pro Plan',
        price: 299.00,
        features: [
          '200 credits included',
          'Designed for about 6 listings per month',
          'Allows 120+ photo edits',
          'Generate 6–8 AI property videos',
          'Access to premium templates',
          'Priority email & chat support'
        ]
      },
      elite: {
        plan: 'Elite Plan',
        price: 599.00,
        features: [
          '400 credits included',
          'Designed for about 12 listings per month',
          'Allows 240+ photo edits',
          'Generate 12–16 AI property videos',
          'Unlimited access to premium templates',
          'Team collaboration tools',
          'Priority support'
        ]
      },
      agency: {
        plan: 'Agency Plan',
        price: 999.00,
        features: [
          '800 credits included',
          'Designed for agencies and power users',
          'Allows 480+ photo edits',
          'Generate 24–32 AI property videos',
          'Unlimited access to all templates',
          'Advanced team collaboration',
          'Dedicated account manager'
        ]
      }
    };

    const currentPlan = planDetails[subscriptionTier as keyof typeof planDetails] || planDetails.free;

    const subscriptionData = {
      id: `sub_${user.id}_${Date.now()}`,
      status: 'active', // 'active', 'cancelled', 'pending_cancellation', 'past_due'
      plan: currentPlan.plan,
      price: currentPlan.price,
      currency: 'ZAR',
      interval: 'month',
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      nextBillingDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'visa'
      },
      features: currentPlan.features
    };

    return NextResponse.json(subscriptionData);

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}