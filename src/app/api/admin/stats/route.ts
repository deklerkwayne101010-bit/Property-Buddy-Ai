import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify the user is authenticated and is admin
    const token = authHeader.substring(7);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check if user is admin (you can modify this logic)
    const adminEmails = ['admin@propertybuddy.ai', 'wayne@propertybuddy.ai']; // Add your admin emails
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get total users count
    const { count: totalUsers, error: usersError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    if (usersError) {
      console.error('Error counting users:', usersError);
    }

    // Get active subscriptions count (non-free tiers)
    const { count: activeSubscriptions, error: subsError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .neq('subscription_tier', 'free')
      .not('subscription_tier', 'is', null);

    if (subsError) {
      console.error('Error counting subscriptions:', subsError);
    }

    // Get monthly active users (users who logged in within the last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { count: monthlyActiveUsers, error: mauError } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .gte('last_sign_in_at', thirtyDaysAgo.toISOString());

    if (mauError) {
      console.error('Error counting MAU:', mauError);
    }

    // Calculate total revenue (this is a simplified calculation)
    // In a real app, you'd track this in a separate payments table
    let totalRevenue = 0;

    // Count users by subscription tier and calculate revenue
    const tiers = ['starter', 'pro', 'elite', 'agency'];
    const tierPrices: { [key: string]: number } = {
      'starter': 15000, // R150 in cents
      'pro': 29900,     // R299 in cents
      'elite': 59900,   // R599 in cents
      'agency': 99900   // R999 in cents
    };

    for (const tier of tiers) {
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('subscription_tier', tier);

      if (!error && count) {
        totalRevenue += count * tierPrices[tier];
      }
    }

    // Convert from cents to rand
    totalRevenue = totalRevenue / 100;

    const stats = {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalRevenue: Math.round(totalRevenue),
      monthlyActiveUsers: monthlyActiveUsers || 0
    };

    return NextResponse.json({
      success: true,
      stats
    });

  } catch (error) {
    console.error('Admin stats API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}