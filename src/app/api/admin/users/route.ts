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
    const adminEmails = ['deklerkwayne101010@gmail.com', 'admin@propertybuddy.ai', 'wayne@propertybuddy.ai']; // Add your admin emails
    if (!adminEmails.includes(user.email || '')) {
      return NextResponse.json({ error: 'Admin access required' }, { status: 403 });
    }

    // Get all users with their profile information
    // Note: email and last_sign_in_at are not stored in profiles table, they're in auth.users
    const { data: users, error } = await supabase
      .from('profiles')
      .select(`
        id,
        subscription_tier,
        credits_balance,
        created_at
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Get email and last_sign_in_at information from auth.users for each profile
    const usersWithEmails = await Promise.all(
      users.map(async (user) => {
        try {
          const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(user.id);
          return {
            id: user.id,
            email: authUser?.user?.email || 'N/A',
            subscription_tier: user.subscription_tier || 'free',
            created_at: user.created_at,
            last_sign_in_at: authUser?.user?.last_sign_in_at || null
          };
        } catch (err) {
          console.error('Error fetching auth user:', err);
          return {
            id: user.id,
            email: 'N/A',
            subscription_tier: user.subscription_tier || 'free',
            created_at: user.created_at,
            last_sign_in_at: null
          };
        }
      })
    );

    if (error) {
      console.error('Error fetching users:', error);
      return NextResponse.json({ error: 'Failed to fetch users' }, { status: 500 });
    }

    // Transform the data to include actual credit values
    const transformedUsers = await Promise.all(usersWithEmails.map(async (user) => {
      const profile = users.find(p => p.id === user.id);

      // Calculate credits used this month for this user
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data: usageData, error: usageError } = await supabase
        .from('usage_tracking')
        .select('credits_used')
        .eq('user_id', user.id)
        .gte('created_at', startOfMonth.toISOString());

      let creditsUsedThisMonth = 0;
      if (!usageError && usageData) {
        creditsUsedThisMonth = usageData.reduce((sum, record) => sum + (record.credits_used || 0), 0);
      }

      return {
        id: user.id,
        email: user.email,
        subscription_tier: user.subscription_tier || 'free',
        created_at: user.created_at,
        last_sign_in_at: user.last_sign_in_at,
        credits_remaining: profile?.credits_balance || 0,
        credits_used_this_month: creditsUsedThisMonth
      };
    }));

    return NextResponse.json({
      success: true,
      users: transformedUsers,
      total: transformedUsers.length
    });

  } catch (error) {
    console.error('Admin users API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}