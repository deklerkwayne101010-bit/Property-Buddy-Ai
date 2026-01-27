import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Mock usage data - in a real app, this would come from your database
    const usageData = {
      credits: 1250,
      usageStats: {
        photoEdits: { used: 450, total: 1000 },
        videoGeneration: { used: 200, total: 500 },
        propertyDescriptions: { used: 100, total: 200 }
      },
      lastUpdated: new Date().toISOString()
    };

    return NextResponse.json(usageData);
  } catch (error) {
    console.error('Error fetching usage data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}