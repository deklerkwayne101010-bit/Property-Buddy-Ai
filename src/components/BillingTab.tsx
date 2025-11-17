/* eslint-disable react/no-unescaped-entities */
'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';

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

interface Subscription {
  id: string;
  status: 'active' | 'cancelled' | 'pending_cancellation' | 'past_due';
  plan: string;
  price: number;
  currency: string;
  interval: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt: string | null;
  nextBillingDate: string;
  paymentMethod: {
    type: string;
    last4: string;
    brand: string;
  };
  features: string[];
}

export default function BillingTab() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscriptionLoading, setSubscriptionLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'subscription' | 'credit_purchase' | 'refund'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending' | 'failed'>('all');
  const [showCreditPurchase, setShowCreditPurchase] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [creditPackage, setCreditPackage] = useState<'50' | '100' | '200' | '300'>('100');
  const [processingPayment, setProcessingPayment] = useState(false);
  const [cancellingSubscription, setCancellingSubscription] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [cancellationFeedback, setCancellationFeedback] = useState('');
  const [immediateCancellation, setImmediateCancellation] = useState(false);

  useEffect(() => {
    loadBillingData();
    loadSubscriptionData();
  }, []);

  const loadBillingData = async () => {
    try {
      const response = await fetch('/api/billing');
      const data = await response.json();
      setTransactions(data.transactions || []);
      setPaymentMethods(data.paymentMethods || []);
    } catch (error) {
      console.error('Error loading billing data:', error);
      // Set empty arrays as fallback
      setTransactions([]);
      setPaymentMethods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptionData = async () => {
    try {
      const response = await fetch('/api/subscription/status');
      const data = await response.json();
      setSubscription(data);
    } catch (error) {
      console.error('Error loading subscription data:', error);
      setSubscription(null);
    } finally {
      setSubscriptionLoading(false);
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
${invoiceData.items.map((item: { description: string; quantity: number; unitPrice: number; amount: number; }) =>
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

  if (loading || subscriptionLoading) {
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

  const handleCreditPurchase = async () => {
    if (!user) return;

    setProcessingPayment(true);
    try {
      const selectedPackage = creditPackages[creditPackage];
      const response = await fetch('/api/payfast/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: selectedPackage.price,
          currency: 'ZAR',
          description: `${selectedPackage.credits} AI Credits`,
          metadata: {
            type: 'credits',
            credits: selectedPackage.credits,
            userId: user.id,
            email: user.email,
            firstName: user.user_metadata?.full_name?.split(' ')[0] || 'Customer',
            lastName: user.user_metadata?.full_name?.split(' ').slice(1).join(' ') || 'User',
            phone: user.user_metadata?.phone || ''
          }
        }),
      });

      const data = await response.json();

      if (data.success && data.formData && data.payfastUrl) {
        // Create and submit Payfast form
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = data.payfastUrl;
        form.style.display = 'none';

        // Add all form fields
        Object.entries(data.formData).forEach(([key, value]) => {
          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = key;
          input.value = value as string;
          form.appendChild(input);
        });

        // Add form to body and submit
        document.body.appendChild(form);
        form.submit();
      } else {
        alert('Failed to create checkout session. Please try again.');
      }
    } catch (error) {
      console.error('Credit purchase error:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleCancelSubscription = async () => {
    if (!subscription) return;

    setCancellingSubscription(true);
    try {
      const response = await fetch('/api/subscription/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          reason: cancellationReason,
          feedback: cancellationFeedback,
          immediate: immediateCancellation,
        }),
      });

      const data = await response.json();

      if (data.success) {
        // Reload subscription data
        await loadSubscriptionData();
        setShowCancelDialog(false);
        setCancellationReason('');
        setCancellationFeedback('');
        setImmediateCancellation(false);

        alert(data.message);
      } else {
        alert('Failed to cancel subscription. Please try again.');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      alert('An error occurred. Please try again.');
    } finally {
      setCancellingSubscription(false);
    }
  };

  const getSubscriptionStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-600 bg-green-100';
      case 'pending_cancellation': return 'text-yellow-600 bg-yellow-100';
      case 'cancelled': return 'text-red-600 bg-red-100';
      case 'past_due': return 'text-orange-600 bg-orange-100';
      default: return 'text-slate-600 bg-slate-100';
    }
  };

  const creditPackages = {
    '50': { credits: 50, price: 25000, displayPrice: 'R250.00' },
    '100': { credits: 100, price: 40000, displayPrice: 'R400.00' },
    '200': { credits: 200, price: 70000, displayPrice: 'R700.00' },
    '300': { credits: 300, price: 90000, displayPrice: 'R900.00' }
  };

  return (
    <div className="space-y-6">
      {/* Subscription Management Section */}
      {subscription && (
        <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-semibold text-slate-900">Subscription Management</h3>
              <p className="text-slate-600 mt-1">Manage your current subscription</p>
            </div>
            <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getSubscriptionStatusColor(subscription.status)}`}>
              {subscription.status.charAt(0).toUpperCase() + subscription.status.slice(1).replace('_', ' ')}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div>
                <h4 className="font-medium text-slate-900">{subscription.plan}</h4>
                <p className="text-2xl font-bold text-blue-600">
                  ${subscription.price}/{subscription.interval}
                </p>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Next billing date:</span>
                  <span className="font-medium">{new Date(subscription.nextBillingDate).toLocaleDateString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Payment method:</span>
                  <span className="font-medium">
                    {subscription.paymentMethod.brand.charAt(0).toUpperCase() + subscription.paymentMethod.brand.slice(1)} •••• {subscription.paymentMethod.last4}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="font-medium text-slate-900">Plan Features</h4>
              <ul className="space-y-1">
                {subscription.features.map((feature, index) => (
                  <li key={index} className="flex items-center text-sm text-slate-600">
                    <span className="text-green-500 mr-2">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {subscription.status === 'active' && (
            <div className="flex justify-end">
              <button
                onClick={() => setShowCancelDialog(true)}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                Cancel Subscription
              </button>
            </div>
          )}

          {subscription.status === 'pending_cancellation' && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center">
                <span className="text-yellow-600 mr-2">⚠️</span>
                <div>
                  <p className="font-medium text-yellow-800">Cancellation Pending</p>
                  <p className="text-sm text-yellow-700">
                    Your subscription will end on {new Date(subscription.currentPeriodEnd).toLocaleDateString()}.
                    You can still use all features until then.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Cancellation Confirmation Dialog */}
      {showCancelDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 p-6">
            <h3 className="text-xl font-semibold text-slate-900 mb-4">Cancel Subscription</h3>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reason for cancellation (optional)
                </label>
                <select
                  value={cancellationReason}
                  onChange={(e) => setCancellationReason(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a reason</option>
                  <option value="too_expensive">Too expensive</option>
                  <option value="not_using">Not using it enough</option>
                  <option value="missing_features">Missing features</option>
                  <option value="technical_issues">Technical issues</option>
                  <option value="switching_service">Switching to another service</option>
                  <option value="temporary_pause">Temporary pause</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Additional feedback (optional)
                </label>
                <textarea
                  value={cancellationFeedback}
                  onChange={(e) => setCancellationFeedback(e.target.value)}
                  placeholder="Tell us how we can improve..."
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  rows={3}
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="immediate"
                  checked={immediateCancellation}
                  onChange={(e) => setImmediateCancellation(e.target.checked)}
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-slate-300 rounded"
                />
                <label htmlFor="immediate" className="ml-2 text-sm text-slate-700">
                  Cancel immediately (lose access right away)
                </label>
              </div>

              {!immediateCancellation && (
                <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                  Your subscription will remain active until the end of your current billing period
                  ({new Date(subscription?.currentPeriodEnd || '').toLocaleDateString()}).
                  you'll still have access to all features during this time.
                </p>
              )}

              {immediateCancellation && (
                <p className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                  ⚠️ Your subscription will be cancelled immediately and you'll lose access to all premium features right away.
                </p>
              )}
            </div>

            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowCancelDialog(false)}
                className="px-4 py-2 text-slate-600 hover:text-slate-700 transition-colors"
                disabled={cancellingSubscription}
              >
                Keep Subscription
              </button>
              <button
                onClick={handleCancelSubscription}
                disabled={cancellingSubscription}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:bg-red-400 disabled:cursor-not-allowed transition-colors"
              >
                {cancellingSubscription ? 'Cancelling...' : 'Confirm Cancellation'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Credit Purchase Section */}
      <div className="bg-white rounded-xl shadow-lg p-6 border border-slate-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-xl font-semibold text-slate-900">Purchase AI Credits</h3>
            <p className="text-slate-600 mt-1">Buy credits to use our AI-powered tools</p>
          </div>
          <button
            onClick={() => setShowCreditPurchase(!showCreditPurchase)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
          >
            {showCreditPurchase ? 'Hide' : 'Buy Credits'}
          </button>
        </div>

        {showCreditPurchase && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="border-t border-slate-200 pt-6"
          >
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              {Object.entries(creditPackages).map(([key, pkg]) => (
                <div
                  key={key}
                  onClick={() => setCreditPackage(key as '50' | '100' | '200' | '300')}
                  className={`cursor-pointer border-2 rounded-lg p-4 transition-all ${
                    creditPackage === key
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="text-center">
                    <div className="text-2xl font-bold text-slate-900">{pkg.credits}</div>
                    <div className="text-sm text-slate-600">Credits</div>
                    <div className="text-lg font-semibold text-blue-600 mt-2">{pkg.displayPrice}</div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-center">
              <button
                onClick={handleCreditPurchase}
                disabled={processingPayment}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed transition-colors font-medium"
              >
                {processingPayment ? 'Processing...' : `Purchase ${creditPackages[creditPackage].credits} Credits`}
              </button>
            </div>
          </motion.div>
        )}
      </div>

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
