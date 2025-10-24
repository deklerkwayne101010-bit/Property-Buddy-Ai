import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    // Allow access for demo purposes - remove this in production
    // if (!user) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    // Mock billing data - in a real app, this would come from your database
    const transactions = [
      {
        id: 'txn_001',
        date: '2024-11-15',
        amount: 29.00,
        description: 'Pro Plan Subscription - November 2024',
        status: 'paid',
        type: 'subscription',
        invoiceUrl: '/api/billing/invoice/txn_001',
        paymentMethod: '•••• •••• •••• 4242'
      },
      {
        id: 'txn_002',
        date: '2024-10-15',
        amount: 29.00,
        description: 'Pro Plan Subscription - October 2024',
        status: 'paid',
        type: 'subscription',
        invoiceUrl: '/api/billing/invoice/txn_002',
        paymentMethod: '•••• •••• •••• 4242'
      },
      {
        id: 'txn_003',
        date: '2024-09-15',
        amount: 29.00,
        description: 'Pro Plan Subscription - September 2024',
        status: 'paid',
        type: 'subscription',
        invoiceUrl: '/api/billing/invoice/txn_003',
        paymentMethod: '•••• •••• •••• 4242'
      },
      {
        id: 'txn_004',
        date: '2024-10-01',
        amount: 39.99,
        description: 'Credit Purchase - 500 Credits',
        status: 'paid',
        type: 'credit_purchase',
        invoiceUrl: '/api/billing/invoice/txn_004',
        paymentMethod: '•••• •••• •••• 4242'
      },
      {
        id: 'txn_005',
        date: '2024-09-20',
        amount: 9.99,
        description: 'Credit Purchase - 100 Credits',
        status: 'paid',
        type: 'credit_purchase',
        invoiceUrl: '/api/billing/invoice/txn_005',
        paymentMethod: '•••• •••• •••• 4242'
      }
    ];

    const paymentMethods = [
      {
        id: 'pm_001',
        type: 'card',
        last4: '4242',
        brand: 'visa',
        expiryMonth: 12,
        expiryYear: 2026,
        isDefault: true
      }
    ];

    return NextResponse.json({
      transactions,
      paymentMethods
    });
  } catch (error) {
    console.error('Error fetching billing data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}