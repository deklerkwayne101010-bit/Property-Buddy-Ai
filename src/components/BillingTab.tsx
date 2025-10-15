'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

interface Transaction {
  id: string;
  date: string;
  amount: number;
  description: string;
  status: 'paid' | 'pending' | 'failed';
  type: 'subscription' | 'credit_purchase' | 'refund';
  invoiceUrl: string;
  paymentMethod: string;
}

interface PaymentMethod {
  id: string;
  type: string;
  last4: string;
  brand: string;
  expiryMonth: number;
  expiryYear: number;
  isDefault: boolean;
}

export default function BillingTab() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'subscription' | 'credit_purchase' | 'refund'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');

  useEffect(() => {
    loadBillingData();
  }, []);

  const loadBillingData = async () => {
    try {
      const response = await fetch('/api/billing');
      const data = await response.json();
      setTransactions(data.transactions);
      setPaymentMethods(data.paymentMethods);
    } catch (error) {
      console.error('Error loading billing data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadInvoice = async (transactionId: string) => {
    try {
      const response = await fetch(`/api/billing/invoice/${transactionId}`);
      const invoiceData = await response.json();

      // In a real app, this would generate and download a PDF
      // For now, we'll create a simple text invoice
      const invoiceText = generateInvoiceText(invoiceData);
      const blob = new Blob([invoiceText], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `invoice-${invoiceData.invoiceNumber}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading invoice:', error);
      alert('Failed to download invoice. Please try again.');
    }
  };

  const generateInvoiceText = (invoiceData: {
    invoiceNumber: string;
    date: string;
    dueDate: string;
    customer: {
      name: string;
      email: string;
      address: string;
    };
    items: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      amount: number;
    }>;
    subtotal: number;
    tax: number;
    total: number;
    paymentMethod: string;
    status: string;
  }) => {
    return `
INVOICE
=======
Invoice Number: ${invoiceData.invoiceNumber}
Date: ${invoiceData.date}
Due Date: ${invoiceData.dueDate}

Customer Information:
${invoiceData.customer.name}
${invoiceData.customer.email}
${invoiceData.customer.address}

Items:
${invoiceData.items.map((item: any) =>
  `${item.description} - Qty: ${item.quantity} - Unit Price: $${item.unitPrice.toFixed(2)} - Amount: $${item.amount.toFixed(2)}`
).join('\n')}

Subtotal: $${invoiceData.subtotal.toFixed(2)}
Tax: $${invoiceData.tax.toFixed(2)}
Total: $${invoiceData.total.toFixed(2)}

Payment Method: ${invoiceData.paymentMethod}
Status: ${invoiceData.status}
    `.trim();
  };

  const filteredTransactions = transactions.filter(transaction => {
    const typeMatch = filter === 'all' || transaction.type === filter;
    const statusMatch = statusFilter === 'all' || transaction.status === statusFilter;
    return typeMatch && statusMatch;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return 'text-green-600 bg-green-100';
      case 'pending': return 'text-yellow-600 bg-yellow-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'subscription': return '💎';
      case 'credit_purchase': return '💰';
      case 'refund': return '↩️';
      default: return '📄';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-slate-200 rounded w-1/4 mb-4"></div>
          <div className="h-32 bg-slate-200 rounded mb-6"></div>
          <div className="h-8 bg-slate-200 rounded w-1/3 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-slate-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Payment Methods */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-slate-900">Payment Methods</h3>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Add Payment Method
          </button>
        </div>

        <div className="space-y-3">
          {paymentMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <span className="text-blue-600 font-bold text-lg">💳</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">
                    {method.brand.charAt(0).toUpperCase() + method.brand.slice(1)} ending in {method.last4}
                    {method.isDefault && <span className="ml-2 text-xs bg-blue-100 text-blue-600 px-2 py-1 rounded">Default</span>}
                  </p>
                  <p className="text-sm text-slate-500">
                    Expires {method.expiryMonth.toString().padStart(2, '0')}/{method.expiryYear}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {!method.isDefault && (
                  <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
                    Set as Default
                  </button>
                )}
                <button className="text-slate-600 hover:text-slate-700 text-sm font-medium">
                  Edit
                </button>
                <button className="text-red-600 hover:text-red-700 text-sm font-medium">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-900">Transaction History</h3>

          {/* Filters */}
          <div className="flex space-x-3">
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as 'all' | 'subscription' | 'credit_purchase' | 'refund')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Types</option>
              <option value="subscription">Subscriptions</option>
              <option value="credit_purchase">Credit Purchases</option>
              <option value="refund">Refunds</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'paid' | 'pending' | 'failed')}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
            </select>
          </div>
        </div>

        <div className="space-y-3">
          {filteredTransactions.map((transaction) => (
            <motion.div
              key={transaction.id}
              className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-center space-x-4">
                <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center">
                  <span className="text-xl">{getTypeIcon(transaction.type)}</span>
                </div>
                <div>
                  <p className="font-medium text-slate-900">{transaction.description}</p>
                  <div className="flex items-center space-x-3 text-sm text-slate-500">
                    <span>{formatDate(transaction.date)}</span>
                    <span>•</span>
                    <span>{transaction.paymentMethod}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-semibold text-slate-900">${transaction.amount.toFixed(2)}</p>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>

                <button
                  onClick={() => handleDownloadInvoice(transaction.id)}
                  className="px-3 py-2 bg-slate-100 text-slate-700 rounded-lg hover:bg-slate-200 transition-colors text-sm font-medium"
                >
                  Download Invoice
                </button>
              </div>
            </motion.div>
          ))}

          {filteredTransactions.length === 0 && (
            <div className="text-center py-8 text-slate-500">
              <p>No transactions found matching your filters.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}