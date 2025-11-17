import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // In a real implementation, you would fetch subscription data from your database
    // For now, we'll return mock subscription data
    const subscriptionData = {
      id: 'sub_1234567890',
      status: 'active', // 'active', 'cancelled', 'pending_cancellation', 'past_due'
      plan: 'Pro Plan',
      price: 29.00,
      currency: 'USD',
      interval: 'month',
      currentPeriodStart: '2024-11-15T00:00:00Z',
      currentPeriodEnd: '2024-12-15T00:00:00Z',
      cancelAtPeriodEnd: false,
      cancelledAt: null,
      nextBillingDate: '2024-12-15',
      paymentMethod: {
        type: 'card',
        last4: '4242',
        brand: 'visa'
      },
      features: [
        'AI Property Descriptions',
        'AI Photo Editor',
        'AI Video Editor',
        'Marketing Materials',
        'Priority Support',
        'Unlimited Credits'
      ]
    };

    return NextResponse.json(subscriptionData);

  } catch (error) {
    console.error('Error fetching subscription status:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}