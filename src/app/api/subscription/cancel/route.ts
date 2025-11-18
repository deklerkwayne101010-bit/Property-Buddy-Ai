import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    // Verify user authentication
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const token = authHeader.substring(7);
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { reason, feedback, immediate = false } = body;

    // In a real implementation, you would:
    // 1. Check if user has an active subscription
    // 2. Cancel the subscription with your payment provider (Stripe, Payfast, etc.)
    // 3. Update user status in database
    // 4. Send confirmation email
    // 5. Store cancellation feedback

    // For now, we'll simulate the cancellation process
    const cancellationData = {
      userId: user.id,
      reason: reason || 'User requested cancellation',
      feedback: feedback || '',
      immediate,
      cancelledAt: new Date().toISOString(),
      effectiveDate: immediate ? new Date().toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days grace period
      status: immediate ? 'cancelled' : 'pending_cancellation'
    };

    // Log the cancellation (in a real app, save to database)
    console.log('Subscription cancellation requested:', cancellationData);

    // Send confirmation email (simulated)
    console.log('Sending cancellation confirmation email to:', user.email);

    return NextResponse.json({
      success: true,
      message: immediate
        ? 'Your subscription has been cancelled immediately.'
        : 'Your subscription will be cancelled at the end of your current billing period.',
      effectiveDate: cancellationData.effectiveDate,
      status: cancellationData.status
    });

  } catch (error) {
    console.error('Error cancelling subscription:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}