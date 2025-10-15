import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '../../../../../lib/supabase';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const transactionId = params.id;

    // Mock invoice data - in a real app, this would generate a PDF
    const invoiceData = {
      invoiceNumber: `INV-${transactionId.toUpperCase()}`,
      date: '2024-11-15',
      dueDate: '2024-11-15',
      customer: {
        name: 'John Doe',
        email: 'john.doe@example.com',
        address: '123 Real Estate St, Property City, PC 12345'
      },
      items: [
        {
          description: 'Pro Plan Subscription - November 2024',
          quantity: 1,
          unitPrice: 29.00,
          amount: 29.00
        }
      ],
      subtotal: 29.00,
      tax: 0.00,
      total: 29.00,
      paymentMethod: 'Visa ending in 4242',
      status: 'Paid'
    };

    // In a real implementation, you would generate a PDF here
    // For now, we'll return JSON that can be used to generate the invoice
    return NextResponse.json(invoiceData);
  } catch (error) {
    console.error('Error generating invoice:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}