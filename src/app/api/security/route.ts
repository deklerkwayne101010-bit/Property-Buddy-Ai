import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock security data - in a real app, this would come from your database
    const securityData = {
      twoFactorEnabled: false,
      loginAlerts: true,
      sessionTimeout: 30,
      passwordLastChanged: '2024-09-15',
      loginHistory: [
        {
          id: '1',
          date: '2024-11-15T10:30:00Z',
          ip: '192.168.1.100',
          location: 'Johannesburg, South Africa',
          device: 'Chrome on Windows',
          status: 'success'
        },
        {
          id: '2',
          date: '2024-11-14T15:45:00Z',
          ip: '192.168.1.100',
          location: 'Johannesburg, South Africa',
          device: 'Safari on iPhone',
          status: 'success'
        },
        {
          id: '3',
          date: '2024-11-12T09:20:00Z',
          ip: '10.0.0.50',
          location: 'Cape Town, South Africa',
          device: 'Firefox on Linux',
          status: 'success'
        },
        {
          id: '4',
          date: '2024-11-10T22:15:00Z',
          ip: '203.0.113.45',
          location: 'Unknown',
          device: 'Chrome on Windows',
          status: 'failed'
        }
      ]
    };

    return NextResponse.json(securityData);
  } catch (error) {
    console.error('Error fetching security data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...data } = await request.json();

    switch (action) {
      case 'changePassword':
        // In a real app, you would update the password via Supabase Auth
        // For now, we'll just return success
        return NextResponse.json({ success: true, message: 'Password changed successfully' });

      case 'toggle2FA':
        // In a real app, you would enable/disable 2FA
        return NextResponse.json({ success: true, twoFactorEnabled: data.enabled });

      case 'updateSecuritySettings':
        // In a real app, you would update security settings in the database
        return NextResponse.json({ success: true, message: 'Security settings updated' });

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}